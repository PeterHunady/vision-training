<template>
  <div class="settings-page" :style="{ backgroundColor: backgroundColor, color: textColor }">
    <header class="title-arrow">
        <div class="arrow">
            <button class="step-back" @click="goBack">
                <h1>&lt;</h1>
            </button>
        </div>

        <div class="title">
            <h1>Settings</h1>
        </div>

        <div class="empty"></div>
    </header>

    <div class="settings-row">
        <div class="left-settings"><p>Circle size:</p></div>
            <div class="right-settings">
                <input type="number" v-model="circleSize" />
            <p>px</p>
        </div>
    </div>

    <div class="settings-row">
        <div class="left-settings">
            <p>Circle lifetime:</p>
        </div>

        <div class="right-settings">
            <input type="number" v-model="circleLifetime" />
            <p>seconds</p>
        </div>
    </div>

    <div class="settings-row">
        <div class="left-settings">
            <p>Training time:</p>
        </div>

        <div class="right-settings">
            <input type="number" v-model="trainingTime" />
            <p>seconds</p>
        </div>
    </div>

    <div class="settings-row">
        <div class="left-settings">
            <p>Circle color:</p>
        </div>
        <div class="right-settings">
            <input type="color" class="color-picker" v-model="circleColor" />
        </div>
    </div>

    <div class="settings-row">
        <div class="left-settings">
            <p>Background color:</p>
        </div>
        <div class="right-settings">
            <input type="color" class="color-picker" v-model="backgroundColor" />
        </div>
    </div>

    <div class="settings-row">
        <div class="left-settings">
            <p>Circle contrast</p>
        </div>
        <div class="right-settings">
            <label class="switch">
                <input type="checkbox" v-model="circleContrast" />
                <span class="slider"></span>
            </label>
        </div>
    </div>

    <div class="settings-row">
        <div class="left-settings">
            <p>Blinking dot:</p>
        </div>
        <div class="right-settings">
            <input type="number" v-model="dotBlinkDuration" step="0.1" min="0.1" />
            <p>seconds</p>
        </div>
    </div>

    <div class="save-container">
        <button class="save" :class="{ active: isDirty }" @click="onSaveClick">Save</button>
    </div>

    <div v-show="showToast" class="toast">{{ toastMessage }}</div>

    <div v-show="showCircle" class="circle circle--top-right" :style="circleStyle"></div>
    <div v-show="showCircle" class="circle circle--bottom-left" :style="circleStyle"></div>

    <div v-show="showPreviewCircle" class="circle circle--preview" :style="previewCircleStyle"></div>
  </div>
</template>

<script setup>
    import { ref, computed, onMounted, onActivated } from 'vue'
    import router from '../router'
    import { onBeforeRouteLeave } from 'vue-router'

    const STORAGE_KEY = 'vision-training-settings-v1'

    const circleSize = ref(200)
    const circleColor = ref('#ffffff')
    const circleLifetime = ref(5)
    const backgroundColor = ref('#000000')
    const trainingTime = ref(300)
    const circleContrast = ref(false)
    const dotBlinkDuration = ref(0.5)

    const showCircle = ref(true)
    const showPreviewCircle = ref(false)
    const textColor = computed(() => getContrastColor(backgroundColor.value))

    const showToast = ref(false)
    const toastMessage = ref('')
    let toastTimer = null
    function toast(msg) {
        toastMessage.value = msg
        showToast.value = true
        if (toastTimer) clearTimeout(toastTimer)
        toastTimer = setTimeout(() => (showToast.value = false), 1600)
    }

    function currentPayload() {
        return {
            circleSize: Number(circleSize.value) || 0,
            circleColor: String(circleColor.value || '#ffffff'),
            circleLifetime: Number(circleLifetime.value) || 0,
            backgroundColor: String(backgroundColor.value || '#000000'),
            trainingTime: Number(trainingTime.value) || 0,
            circleContrast: !!circleContrast.value,
            dotBlinkDuration: Number(dotBlinkDuration.value) || 0.7,
        }
    }

    const savedSnapshot = ref(currentPayload())
    const isDirty = computed(() => JSON.stringify(currentPayload()) !== JSON.stringify(savedSnapshot.value))

    function applySnapshot(s) {
        if (!s) return
        circleSize.value = Number(s.circleSize ?? circleSize.value)
        circleColor.value = s.circleColor ?? circleColor.value
        circleLifetime.value = Number(s.circleLifetime ?? circleLifetime.value)
        backgroundColor.value = s.backgroundColor ?? backgroundColor.value
        trainingTime.value = Number(s.trainingTime ?? trainingTime.value)
        circleContrast.value = !!s.circleContrast
        dotBlinkDuration.value = Number(s.dotBlinkDuration ?? dotBlinkDuration.value)
    }

    function saveSettings() {
        const payload = currentPayload()
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
        savedSnapshot.value = payload
        document.documentElement.style.backgroundColor = payload.backgroundColor
        document.body.style.backgroundColor = payload.backgroundColor
    }

    function resetFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            const s = raw ? JSON.parse(raw) : null
            applySnapshot(s)
            savedSnapshot.value = currentPayload()
        } catch (e) {
            console.warn('Failed to load settings', e)
        }
    }

    onMounted(resetFromStorage)
    onActivated(resetFromStorage)

    onBeforeRouteLeave((_to, _from, next) => {
        if (isDirty.value) {
            applySnapshot(savedSnapshot.value)
        }
        next()
    })

    function getContrastColor(hex) {
        const c = hex?.startsWith('#') ? hex.substring(1) : hex
        if (!c || c.length < 6) return 'white'
        const r = parseInt(c.substr(0, 2), 16)
        const g = parseInt(c.substr(2, 2), 16)
        const b = parseInt(c.substr(4, 2), 16)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return luminance < 0.5 ? 'white' : 'black'
    }

    function onSaveClick() {
        if (!isDirty.value) {
            toast('Nothing to save')
            return
        }
        saveSettings()
        toast('Saved')
    }

    const circleStyle = computed(() => ({
        width: `${Number(circleSize.value) || 0}px`,
        height: `${Number(circleSize.value) || 0}px`,
        backgroundColor: circleColor.value,
    }))

    const previewCircleStyle = computed(() => ({
        width: '140px',
        height: '140px',
        borderRadius: '50%',
        border: `1px solid ${textColor.value}`,
        backgroundColor: 'transparent',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
    }))

    function goBack() {
        router.push('/')
    }
</script>

<style scoped>
p {
    font-size: 20px;
}

.title-arrow {
    display: flex;
    width: 100%;
}

.arrow, .title, .empty {
    flex: 1 1 33%;
    max-width: 33%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.arrow {
    justify-content:left;
}

.settings-row{
    display: flex;
    align-items: center;
    justify-content: center;
}

.settings-row p{
    padding-left: 5px;
    padding-right: 20px;
}

.left-settings, .right-settings{
    flex: 1 1;
    display: flex;
    align-items: center;
}

.left-settings{
    justify-content: right;
}

.right-settings{
    justify-content: left;
}

input{
    background-color: #f1f1f1;
    color: black;
    border: 1px solid black;
    box-shadow: 0 0 5px 1px #f1f1f1;
    width: 70px;
    height: 25px;
    box-sizing: border-box;
    font-size: 20px;
    margin-left: 20px;
}

input[type="color"].color-picker { 
    padding: 0;
    background: transparent; 
    border: 1px solid black;
    box-shadow: 0 0 5px 1px #f1f1f1;
    display: inline-block;
    vertical-align: middle;
}

.circle {
    position: fixed;
    border-radius: 50%;
    pointer-events: none;
    box-shadow: 0 0 12px rgba(255,255,255,0.35);
}

.circle--top-right {
    top: 250px;
    right: 150px;
}

.circle--bottom-left {
    bottom: 250px;
    left:150px;
}

.switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 25px;
}

.switch input {
    opacity: 0;
    width: 0;
    height:0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 20px;
    right: 0;
    bottom: 0;
    width: 100%;
    background-color: #ccc;
    transition: .3s; 
    border-radius: 25px;
    padding-left: 20px; 
}

.slider:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 2.5px;
    background-color: white;
    transition: .3s;
    border-radius: 50%;
}

.switch input:checked + .slider {
    background-color:#4caf50;
}

.switch input:checked + .slider:before {
    transform:translateX(40px);
}

.save-container {
    display: flex;
    justify-content: center;
    width:100%;
}

.save {
    background-color: #777;
    color: white;
    font-size: 20px;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    margin-top: 50px;
    cursor: pointer;
    display: block;
    transition: background-color .2s ease,opacity .2s ease;
    opacity: .9;
}

.save.active {
    background-color: #4caf50;
    opacity: 1;
}

.toast {
    position: fixed;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: #fff;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.35);
    pointer-events: none;
}

.step-back{
    background: transparent;
    border: none;
    outline: none;
    box-shadow: none;
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
    height: 100%;
}

.settings-page {
    min-height: 100vh;
    width: 100vw;
    position: relative;
}

.settings-page h1 {
    margin-top: 20px;
}
</style>
