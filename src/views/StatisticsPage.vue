<template>
    <header
        class="title-arrow"
        :style="{ color: textColor }"
    >
        <div class="arrow">
            <button class="step-back" @click="goBack">
                <h1><</h1>
            </button>
        </div>

        <div class="title">
            <h1>Statistics</h1>
        </div>

        <div class="empty"></div>
    </header>

    <div class="stats" :style="{ backgroundColor: backgroundColor, color: textColor }">
        <div v-if="pagedItems.length === 0" class="empty">
            No sessions yet.
        </div>

        <table v-else class="meta-wide">
            <thead>
                <tr>
                <th>Session</th>
                <th>Circles</th>
                <th>Duration</th>
                <th>Circle size</th>
                <th>Circles lifetime</th>
                <th>Contrast</th>
                <th>Minimap</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="s in pagedItems" :key="s.id">
                    <td>#{{ s.id }} – {{ formatDate(s.startedAt) }}</td>
                    <td><strong>{{ s.clickedCount }}</strong> / {{ s.spawnedCount }}</td>
                    <td>{{ s.durationSec }} s</td>
                    <td>{{ s.settings.circleSize }} px</td>
                    <td>{{ s.settings.circleLifetime }} s</td>
                    <td>{{ s.settings.circleContrast ? 'on' : 'off' }}</td>
                    <td class="mini-cell">
                        <canvas
                        class="minimap"
                        :ref="setCanvasRef(s.id)"
                        width="200"
                        height="120"
                        ></canvas>
                    </td>
                </tr>
            </tbody>
        </table>

        <div v-if="pages > 1" class="pager">
            <button :disabled="page===1" @click="page--">Prev</button>
            <span>Page {{ page }} / {{ pages }}</span>
            <button :disabled="page===pages" @click="page++">Next</button>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted, watch } from 'vue'
    import { useRouter } from 'vue-router'

    const router = useRouter()
    function goBack () { router.push('/') }

    const STATS_KEY = 'vision-training-stats-v1'
    const SETTINGS_KEY = 'vision-training-settings-v1'
    const PER_PAGE = 10

    const all = ref([])
    const page = ref(1)
    const canvasRefs = new Map()

    const backgroundColor = ref('#000000')
    const textColor = computed(() => getContrastColor(backgroundColor.value))

    function setCanvasRef(id){ return (el)=>{
        if(el) canvasRefs.set(id, el) 
    } }

    function loadAll() {
        try{
            const raw = localStorage.getItem(STATS_KEY)
            all.value = raw ? JSON.parse(raw) : []
        }catch{ all.value = [] }
    }

    function loadBackground() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY)
            if (!raw) return
            const s = JSON.parse(raw)
            if (s.backgroundColor) backgroundColor.value = s.backgroundColor
        } catch {}
    }

    const pages = computed(()=> Math.max(1, Math.ceil(all.value.length / PER_PAGE)))
    const pagedItems = computed(()=>{
        const start = (page.value-1)*PER_PAGE
        return all.value.slice().reverse().slice(start, start+PER_PAGE)
    })

    function formatDate(iso){ 
        try { 
            return new Date(iso).toLocaleString()
        } catch {
            return iso
        }
    }

    function drawMinimap(session){
        const canvas = canvasRefs.get(session.id)
        if(!canvas) return

        const ctx = canvas.getContext('2d')
        const W = canvas.width, H = canvas.height
        ctx.clearRect(0,0,W,H)
        ctx.fillStyle = '#111'
        ctx.fillRect(0,0,W,H)
        const w = session.gridW, h = session.gridH
        const heat = session.heat || []
        const max = Math.max(1, ...heat)
        const cellW = W / w, cellH = H / h

        for(let iy=0; iy<h; iy++){
            for(let ix=0; ix<w; ix++){
                const v = heat[iy*w + ix] || 0
                if(!v) continue
                const a = Math.min(1, v / max)
                ctx.fillStyle = `rgba(0, 200, 0, ${0.15 + 0.85*a})`
                ctx.fillRect(ix*cellW, iy*cellH, cellW, cellH)
            }
        }
        ctx.fillStyle = 'rgba(255,0,0,0.8)'
        ctx.beginPath(); ctx.arc(W/2, H/2, 3, 0, Math.PI*2); ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.strokeRect(0.5,0.5,W-1,H-1)
    }

    function drawCurrentPage(){ 
        requestAnimationFrame(()=>{ 
            pagedItems.value.forEach(drawMinimap)
        })
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

    watch(backgroundColor, (nc) => {
        document.documentElement.style.backgroundColor = nc
        document.body.style.backgroundColor = nc
    }, { immediate: true })

    onMounted(()=>{
        loadBackground()
        loadAll()
        drawCurrentPage()
    })
    watch([page, pagedItems], drawCurrentPage)
</script>

<style scoped>
    .title-arrow {
        display: flex;
        width: 100%;
        align-items: center;
        color: inherit;
    }

    .title-arrow h1 {
        color: inherit;
    }

    .arrow, .title, .empty {
        flex: 1 1 33%;
        max-width: 33%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .arrow {
        justify-content: left;
    }

    .step-back{
        background: transparent;
        border: none;
        outline: none;
        box-shadow: none;
        -webkit-appearance: none;
        appearance: none;
        padding: 0;
        margin-left: 50px;
        color: inherit;
        cursor: pointer;
    }

    .step-back:hover, .step-back:focus-visible, .step-back:active{
        border: none !important;
    }

    :global(html, body, #app) {
        min-height: 100%;
    }

    .stats{
        max-width: 1200px;
        margin: 40px auto;
        padding: 0 16px;
        color: inherit;
    }

    .meta-wide{
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 15px;
        line-height: 1.35;
        color: inherit;
        background: transparent;
    }

    .meta-wide th, .meta-wide td{
        padding: 10px 12px;
        border-bottom: 1px solid rgba(255,255,255,.06);
        text-align: left;
        vertical-align: middle;
        color: inherit;
    }

    .meta-wide thead th{
        font-weight: 700;
        white-space: nowrap;
        color: inherit;
    }

    .meta-wide th:last-child, .meta-wide td:last-child{
        width: 220px;
    }

    .mini-cell{
        padding: 8px 0 8px 12px;
    }

    .minimap{
        width: 200px;
        height: 120px;
        background: #0b0b0b;
        border-radius: 6px;
        display: block;
        box-shadow: 0 0 0 1px rgba(255,255,255,0.08) inset;
    }

    .pager{
        display:flex;
        gap:12px;
        justify-content:center;
        align-items:center;
        margin-top: 30px;
        padding-bottom: 50px;
    }

    .pager button{
        padding:6px 12px;
        border:none;
        border-radius:8px;
        cursor:pointer;
    }

    .empty{
        text-align:center;
        opacity:.7;
        margin-top:40px;
    }


    @media (max-width: 900px){
        .meta-wide, .meta-wide thead, .meta-wide tbody, .meta-wide tr { display: block; }
        .meta-wide thead{ display:none; }
        .meta-wide tbody tr{ display: grid; grid-template-columns: 1fr; gap: 10px; }
        .meta-wide td{ border: none; padding: 0; }
        .mini-cell{ margin-top: 8px; }
        .minimap{ width: 100%; height: 140px; }
    }

    tr td:first-child {
        font-weight: 900;
    }
</style>
