<template>
    <div class="training" :style="{ backgroundColor }">
        <div v-if="showDot" class="dot" :style="{ backgroundColor: dotColor }"></div>

        <div
            v-if="showCircle"
            class="circle"
            :style="circleStyle"
            @click="onCircleClick"
        ></div>

        <div v-if="gameOver" class="dialog">
            <h1>Game Over</h1>
            <button @click="goHome">Back to Home</button>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted, onBeforeUnmount } from "vue"
    import { useRouter } from "vue-router"

    const router = useRouter()
    const SETTINGS_KEY = "vision-training-settings-v1"
    const STATS_KEY    = "vision-training-stats-v1"

    const backgroundColor = ref("#000000")
    const circleSize = ref(200)
    const circleColor = ref("#ffffff")
    const circleLifetime = ref(3)
    const trainingTime = ref(30)
    const circleContrast = ref(false)
    const dotBlinkDuration = ref(0.5)

    const showDot = ref(true)
    const showCircle = ref(false)
    const circleX = ref(0)
    const circleY = ref(0)
    const circleActualColor = ref(circleColor.value)
    const gameOver = ref(false)
    const isRunning = ref(false)

    const spawnedCount = ref(0)
    const clickedCount = ref(0)

    const GRID_W = 30
    const GRID_H = 18
    const heatmap = Array(GRID_H).fill(0).map(() => Array(GRID_W).fill(0))

    let circleTimer = null
    let trainingTimer = null
    let respawnTimer = null
    let startedAt = 0

    let dotInterval = null

    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY)
            if (!raw) return
            const s = JSON.parse(raw)
            if (s.backgroundColor) backgroundColor.value = s.backgroundColor
            if (s.circleSize) circleSize.value = s.circleSize
            if (s.circleColor) circleColor.value = s.circleColor
            if (s.circleLifetime) circleLifetime.value = s.circleLifetime
            if (s.trainingTime) trainingTime.value = s.trainingTime
            if (typeof s.circleContrast === "boolean") circleContrast.value = s.circleContrast
            if (s.dotBlinkDuration != null) dotBlinkDuration.value = Number(s.dotBlinkDuration)
        } catch (e) {
            console.warn("Failed to load settings", e)
        }
    }

    const dotColor = computed(() => getContrastColor(backgroundColor.value))

    function getContrastColor(hex) {
        const c = hex?.startsWith('#') ? hex.slice(1) : hex
        if (!c || c.length < 6) return 'white'
        const r = parseInt(c.slice(0,2),16)
        const g = parseInt(c.slice(2,4),16)
        const b = parseInt(c.slice(4,6),16)
        const L = (0.299*r + 0.587*g + 0.114*b) / 255
        return L < 0.5 ? 'white' : 'black'
    }

    function getRandomContrast(baseColor) {
        if (!circleContrast.value) return baseColor
        const c = baseColor.substring(1)
        const r = parseInt(c.substr(0,2),16)
        const g = parseInt(c.substr(2,2),16)
        const b = parseInt(c.substr(4,2),16)
        const factor = 0.7 + Math.random()*0.6
        const nr = Math.min(255, Math.max(0, Math.round(r*factor)))
        const ng = Math.min(255, Math.max(0, Math.round(g*factor)))
        const nb = Math.min(255, Math.max(0, Math.round(b*factor)))
        return `rgb(${nr}, ${ng}, ${nb})`
    }

    const circleStyle = computed(() => ({
        width: circleSize.value + "px",
        height: circleSize.value + "px",
        left: circleX.value + "px",
        top:  circleY.value + "px",
        backgroundColor: circleActualColor.value,
    }))

    function clamp(v,min,max){
        return Math.max(min, Math.min(max, v))
    }

    function computeSpawnPosition() {
        const size = circleSize.value
        const half = size/2
        const cx = window.innerWidth/2
        const cy = window.innerHeight/2
        const spawnRadius = Math.max(0, cy - half) * 0.85

        const theta = Math.random()*Math.PI*2
        const r = Math.sqrt(Math.random()) * spawnRadius
        let x = cx + r*Math.cos(theta) - half
        let y = cy + r*Math.sin(theta) - half

        x = clamp(x, 0, window.innerWidth - size)
        y = clamp(y, 0, window.innerHeight - size)
        return { x, y }
    }

    function spawnCircle() {
        if (!isRunning.value) return
        const { x, y } = computeSpawnPosition()
        circleX.value = x
        circleY.value = y
        circleActualColor.value = getRandomContrast(circleColor.value)
        showCircle.value = true
        spawnedCount.value++

        circleTimer = setTimeout(() => {
            showCircle.value = false
            if (!isRunning.value) return
            respawnTimer = setTimeout(spawnCircle, 2000)
        }, circleLifetime.value * 1000)
    }

    function binClickToHeatmap(xPx, yPx) {
        const cx = xPx + circleSize.value/2
        const cy = yPx + circleSize.value/2
        const xn = cx / window.innerWidth
        const yn = cy / window.innerHeight
        const ix = clamp(Math.floor(xn * GRID_W), 0, GRID_W-1)
        const iy = clamp(Math.floor(yn * GRID_H), 0, GRID_H-1)
        heatmap[iy][ix] += 1
    }

    function onCircleClick() {
        if (!isRunning.value) return
        binClickToHeatmap(circleX.value, circleY.value)
        clickedCount.value++

        if (circleTimer) clearTimeout(circleTimer)
        showCircle.value = false
        respawnTimer = setTimeout(spawnCircle, 2000)
    }

    function startBlinking() {
        stopBlinking()
        showDot.value = true
        const ms = Math.max(50, Math.round(dotBlinkDuration.value * 1000))
        dotInterval = setInterval(() => {
            if (!isRunning.value) return
            showDot.value = !showDot.value
        }, ms)
    }

    function stopBlinking() {
        if (dotInterval) {
            clearInterval(dotInterval)
            dotInterval = null
        }
        showDot.value = true
    }

    function startTraining() {
        loadSettings()
        isRunning.value = true
        startedAt = Date.now()

        startBlinking()

        respawnTimer = setTimeout(spawnCircle, 2000)

        trainingTimer = setTimeout(() => {
            endTraining()
        }, trainingTime.value * 1000)
    }

    function endTraining() {
        isRunning.value = false
        showCircle.value = false
        if (circleTimer)  clearTimeout(circleTimer)
        if (respawnTimer) clearTimeout(respawnTimer)
        if (trainingTimer)clearTimeout(trainingTimer)
        stopBlinking()

        const durationSec = Math.round((Date.now() - startedAt)/1000)
        saveSessionStat({
            startedAt: new Date().toISOString(),
            durationSec,
            spawnedCount: spawnedCount.value,
            clickedCount: clickedCount.value,
            settings: {
                backgroundColor: backgroundColor.value,
                circleSize: circleSize.value,
                circleColor: circleColor.value,
                circleLifetime: circleLifetime.value,
                trainingTime: trainingTime.value,
                circleContrast: circleContrast.value,
                dotBlinkDuration: dotBlinkDuration.value,
            },
            gridW: GRID_W,
            gridH: GRID_H,
            heat: heatmap.flat(),
        })

        gameOver.value = true
    }

    function saveSessionStat(entry) {
        const raw = localStorage.getItem(STATS_KEY)
        const list = raw ? JSON.parse(raw) : []
        const id = list.length + 1
        list.push({ id, ...entry })
        localStorage.setItem(STATS_KEY, JSON.stringify(list))
    }

    function goHome() {
        router.push("/")
    }

    onMounted(() => {
        startTraining()
    })

    onBeforeUnmount(() => {
        isRunning.value = false
        if (circleTimer)  clearTimeout(circleTimer)
        if (respawnTimer) clearTimeout(respawnTimer)
        if (trainingTimer)clearTimeout(trainingTimer)
        stopBlinking()
    })
</script>

<style scoped>
    .training {
        width: 100vw;
        height: 100vh;
        position: relative;
        overflow: hidden;
    }

    .dot {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    .circle {
        position: absolute;
        border-radius: 50%;
        cursor: pointer;
    }

    .dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px 30px;
        border-radius: 8px;
        text-align: center;
        color: black;
    }

    .dialog button {
        margin-top: 20px;
        padding: 10px 20px;
        font-size: 18px;
    }
</style>
