<template>
    <div class="landing" :style="{ backgroundColor: backgroundColor, color: textColor }">
        <h1 class="title">Vision Training</h1>

        <div class="landing-button">
            <div>
                <button class="play-button" @click="goToTraining">Play</button>
            </div>
            <div>
                <button class="settings-button" @click="goToSettings">Settings</button>
            </div>
            <div>
                <button class="statistics-button" @click="goToStatistics">Statistics</button>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted, watch } from 'vue'
    import router from '../router'

    const SETTINGS_KEY = 'vision-training-settings-v1'
    const backgroundColor = ref('#000000')
    const textColor = computed(() => getContrastColor(backgroundColor.value))

    function goToSettings(){ router.push('/settings') }
    function goToTraining(){ router.push('/training') }
    function goToStatistics(){ router.push('/statistics') }

    function loadBackground() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY)
            if (!raw) return
            const s = JSON.parse(raw)
            if (s.backgroundColor) backgroundColor.value = s.backgroundColor
        } catch {}
    }

    function getContrastColor(hex) {
        const c = hex?.startsWith('#') ? hex.slice(1) : hex
        if (!c || c.length < 6) return 'white'
        const r = parseInt(c.slice(0,2),16)
        const g = parseInt(c.slice(2,4),16)
        const b = parseInt(c.slice(4,6),16)
        const L = (0.299*r + 0.587*g + 0.114*b) / 255
        return L < 0.5 ? 'white' : 'black'
    }

    onMounted(loadBackground)

    watch(backgroundColor, (nc) => {
        document.documentElement.style.backgroundColor = nc
        document.body.style.backgroundColor = nc
    }, { immediate: true })
</script>

<style scoped>
    .landing {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: inherit;
    }

    h1.title {
        font-size: 60px;
        animation: pulse 3s infinite ease-in-out;
        margin-bottom: 150px;
        color: inherit;
    }

    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }

    button {
        font-size: 30px;
        padding: 20px;
        margin: 20px 0;
        width: 200px;
        font-weight: 700;
        background-color: #f1f1f1;
        color: black;
    }
</style>
