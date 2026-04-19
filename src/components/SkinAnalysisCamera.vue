<template>
  <div v-if="modelValue" class="camera-modal" @click.self="close">
    <div class="camera-container">
      <!-- 关闭按钮 -->
      <button class="close-btn" @click.stop="close">✕</button>

      <!-- 标题 -->
      <div class="camera-header">
        <h3>📷 AI 肤质分析</h3>
        <p>拍照识别你的肤质类型</p>
      </div>

      <!-- 拍照/上传区域 -->
      <div class="camera-body">
        <!-- 实时预览/拍照模式 -->
        <div v-if="mode === 'camera' && !capturedImage" class="camera-preview-area">
          <video ref="videoRef" autoplay playsinline class="camera-video"></video>
          <div class="camera-overlay">
            <div class="face-frame">
              <div class="corner top-left"></div>
              <div class="corner top-right"></div>
              <div class="corner bottom-left"></div>
              <div class="corner bottom-right"></div>
            </div>
            <p class="hint">请将脸部对准框内</p>
          </div>
          <button class="capture-btn" @click="capturePhoto">
            <div class="capture-circle"></div>
          </button>
        </div>

        <!-- 已拍摄/上传的图片预览 -->
        <div v-else-if="capturedImage" class="image-preview-area">
          <img :src="capturedImage" alt="Captured" class="preview-image" />
          <div v-if="isAnalyzing" class="analyzing-overlay">
            <div class="analyzing-spinner"></div>
            <p>AI正在分析你的肤质...</p>
            <div class="analysis-steps">
              <div class="step" :class="{ active: analysisStep >= 1 }">
                <span class="step-icon">{{ analysisStep >= 1 ? '✓' : '○' }}</span>
                <span>检测面部特征</span>
              </div>
              <div class="step" :class="{ active: analysisStep >= 2 }">
                <span class="step-icon">{{ analysisStep >= 2 ? '✓' : '○' }}</span>
                <span>分析肤质类型</span>
              </div>
              <div class="step" :class="{ active: analysisStep >= 3 }">
                <span class="step-icon">{{ analysisStep >= 3 ? '✓' : '○' }}</span>
                <span>生成护肤建议</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 上传模式 -->
        <div v-else class="upload-area" @click="triggerFileInput">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleFileUpload"
            style="display: none"
          />
          <div class="upload-icon">📤</div>
          <p class="upload-text">点击上传照片</p>
          <p class="upload-hint">或拖拽图片到此处</p>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="camera-footer">
        <div v-if="!capturedImage" class="mode-switch">
          <button
            class="mode-btn"
            :class="{ active: mode === 'camera' }"
            @click="switchMode('camera')"
          >
            📷 拍照
          </button>
          <button
            class="mode-btn"
            :class="{ active: mode === 'upload' }"
            @click="switchMode('upload')"
          >
            📁 相册
          </button>
        </div>

        <div v-else-if="!isAnalyzing" class="action-buttons">
          <button class="secondary-btn" @click="retake">重拍</button>
          <button class="primary-btn" @click="analyzeSkin">开始分析</button>
        </div>
      </div>

      <!-- 分析结果 -->
      <transition name="slide-up">
        <div v-if="analysisResult" class="analysis-result">
          <div class="result-header">
            <h4>🎯 分析结果</h4>
            <button class="close-result" @click="analysisResult = null">✕</button>
          </div>

          <div class="skin-type-badge" :class="analysisResult.skinType">
            {{ skinTypeLabels[analysisResult.skinType] }}
          </div>

          <div class="result-section">
            <h5>肤质特征</h5>
            <ul class="feature-list">
              <li v-for="(feature, idx) in analysisResult.features" :key="idx">
                {{ feature }}
              </li>
            </ul>
          </div>

          <div class="result-section">
            <h5>主要问题</h5>
            <div class="problem-tags">
              <span
                v-for="(problem, idx) in analysisResult.problems"
                :key="idx"
                class="problem-tag"
              >
                {{ problem }}
              </span>
            </div>
          </div>

          <div class="result-section">
            <h5>护肤建议</h5>
            <p class="advice-text">{{ analysisResult.advice }}</p>
          </div>

          <!-- 化妆建议 -->
          <div v-if="analysisResult.makeup" class="result-section makeup-section">
            <h5>💄 妆容建议</h5>
            <div class="makeup-tips">
              <div class="makeup-item">
                <div class="makeup-icon">🎯</div>
                <div class="makeup-content">
                  <div class="makeup-title">遮瑕技巧</div>
                  <p>{{ analysisResult.makeup.concealer }}</p>
                </div>
              </div>
              <div class="makeup-item">
                <div class="makeup-icon">✨</div>
                <div class="makeup-content">
                  <div class="makeup-title">提亮高光</div>
                  <p>{{ analysisResult.makeup.brighten }}</p>
                </div>
              </div>
              <div class="makeup-item">
                <div class="makeup-icon">🎨</div>
                <div class="makeup-content">
                  <div class="makeup-title">修容塑形</div>
                  <p>{{ analysisResult.makeup.contour }}</p>
                </div>
              </div>
            </div>
          </div>

          <button class="use-result-btn" @click="applyResult">
            使用分析结果开始咨询
          </button>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { apiClient } from '../agent/api-client.js'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'analysis-complete'])

// 状态
const mode = ref('upload') // 'camera' | 'upload'
const capturedImage = ref(null)
const isAnalyzing = ref(false)
const analysisStep = ref(0)
const analysisResult = ref(null)
const stream = ref(null)

// Refs
const videoRef = ref(null)
const fileInput = ref(null)

// 肤质类型标签
const skinTypeLabels = {
  oily: '油性肌肤',
  dry: '干性肌肤',
  mixed: '混合肌肤',
  sensitive: '敏感肌肤',
  normal: '中性肌肤'
}

// 关闭弹窗
const close = () => {
  stopCamera()
  emit('update:modelValue', false)
  resetState()
}

// 重置状态
const resetState = () => {
  capturedImage.value = null
  analysisResult.value = null
  isAnalyzing.value = false
  analysisStep.value = 0
}

// 切换模式
const switchMode = (newMode) => {
  mode.value = newMode
  if (newMode === 'camera') {
    startCamera()
  } else {
    stopCamera()
  }
}

// 启动摄像头
const startCamera = async () => {
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream.value
    }
  } catch (error) {
    console.error('Camera error:', error)
    alert('无法访问摄像头，请使用上传功能')
    mode.value = 'upload'
  }
}

// 停止摄像头
const stopCamera = () => {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
    stream.value = null
  }
}

// 压缩图片
const compressImage = (dataUrl, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height

      // 计算缩放比例
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

// 拍照
const capturePhoto = async () => {
  if (!videoRef.value) return

  const canvas = document.createElement('canvas')
  canvas.width = videoRef.value.videoWidth
  canvas.height = videoRef.value.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(videoRef.value, 0, 0)

  // 压缩图片
  const originalImage = canvas.toDataURL('image/jpeg', 0.9)
  capturedImage.value = await compressImage(originalImage, 800, 0.8)
  stopCamera()
}

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click()
}

// 处理文件上传
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    // 压缩图片
    capturedImage.value = await compressImage(e.target.result, 800, 0.8)
  }
  reader.readAsDataURL(file)
}

// 重拍
const retake = () => {
  capturedImage.value = null
  analysisResult.value = null
  if (mode.value === 'camera') {
    startCamera()
  }
}

// 分析肤质
const analyzeSkin = async () => {
  if (!capturedImage.value) return

  isAnalyzing.value = true
  analysisStep.value = 1

  try {
    // 步骤1：检测面部特征
    await new Promise(resolve => setTimeout(resolve, 800))
    analysisStep.value = 2

    // 步骤2：分析肤质
    await new Promise(resolve => setTimeout(resolve, 800))
    analysisStep.value = 3

    // 调用API分析
    const result = await apiClient.analyzeSkin(capturedImage.value)
    analysisResult.value = result

  } catch (error) {
    console.error('Analysis error:', error)
    // 使用默认结果
    analysisResult.value = {
      skinType: 'mixed',
      features: ['T区偏油', '两颊偏干', '毛孔较明显'],
      problems: ['水油不平衡', '毛孔粗大'],
      advice: '建议使用分区护理，T区控油，两颊保湿。选择温和的氨基酸洁面，避免过度清洁。'
    }
  }

  isAnalyzing.value = false
}

// 应用分析结果
const applyResult = () => {
  if (!analysisResult.value) return

  emit('analysis-complete', {
    skinType: analysisResult.value.skinType,
    description: `我的肤质是${skinTypeLabels[analysisResult.value.skinType]}，主要问题是${analysisResult.value.problems.join('、')}，${analysisResult.value.advice}`
  })
  close()
}

// 生命周期
onMounted(() => {
  if (mode.value === 'camera') {
    startCamera()
  }
})

onUnmounted(() => {
  stopCamera()
})
</script>

<style scoped>
.camera-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.camera-container {
  background: #1a1a2e;
  border-radius: 24px;
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 18px;
  cursor: pointer;
  z-index: 10;
}

.camera-header {
  padding: 24px 24px 16px;
  text-align: center;
}

.camera-header h3 {
  color: white;
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 4px;
}

.camera-header p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.camera-body {
  aspect-ratio: 3/4;
  background: #0f0f23;
  position: relative;
}

/* 相机预览 */
.camera-preview-area {
  width: 100%;
  height: 100%;
  position: relative;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.face-frame {
  width: 200px;
  height: 260px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 100px;
  position: relative;
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: #FF8E9E;
  border-style: solid;
}

.corner.top-left {
  top: -2px;
  left: -2px;
  border-width: 3px 0 0 3px;
  border-top-left-radius: 20px;
}

.corner.top-right {
  top: -2px;
  right: -2px;
  border-width: 3px 3px 0 0;
  border-top-right-radius: 20px;
}

.corner.bottom-left {
  bottom: -2px;
  left: -2px;
  border-width: 0 0 3px 3px;
  border-bottom-left-radius: 20px;
}

.corner.bottom-right {
  bottom: -2px;
  right: -2px;
  border-width: 0 3px 3px 0;
  border-bottom-right-radius: 20px;
}

.hint {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-top: 20px;
  background: rgba(0, 0, 0, 0.5);
  padding: 8px 16px;
  border-radius: 20px;
}

.capture-btn {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 70px;
  height: 70px;
  background: white;
  border: none;
  border-radius: 50%;
  padding: 4px;
  cursor: pointer;
}

.capture-circle {
  width: 100%;
  height: 100%;
  background: #FF8E9E;
  border-radius: 50%;
  border: 3px solid white;
}

/* 图片预览 */
.image-preview-area {
  width: 100%;
  height: 100%;
  position: relative;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.analyzing-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.analyzing-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 142, 158, 0.3);
  border-top-color: #FF8E9E;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.analyzing-overlay > p {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 24px;
}

.analysis-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  transition: color 0.3s;
}

.step.active {
  color: #FF8E9E;
}

.step-icon {
  width: 20px;
  text-align: center;
}

/* 上传区域 */
.upload-area {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  margin: 20px;
  width: calc(100% - 40px);
  height: calc(100% - 40px);
  border-radius: 16px;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: #FF8E9E;
  background: rgba(255, 142, 158, 0.05);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-text {
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.upload-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

/* 底部操作栏 */
.camera-footer {
  padding: 16px 24px 24px;
}

.mode-switch {
  display: flex;
  gap: 12px;
}

.mode-btn {
  flex: 1;
  padding: 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid transparent;
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn.active {
  background: #FF8E9E;
  border-color: #FF8E9E;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.secondary-btn,
.primary-btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.primary-btn {
  background: #FF8E9E;
  color: white;
}

/* 分析结果 */
.analysis-result {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 24px 24px 0 0;
  padding: 24px;
  max-height: 70%;
  overflow-y: auto;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.result-header h4 {
  font-size: 18px;
  font-weight: 800;
  color: #2D3436;
}

.close-result {
  width: 32px;
  height: 32px;
  background: #f5f5f5;
  border: none;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
}

.skin-type-badge {
  display: inline-block;
  padding: 12px 24px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 20px;
}

.skin-type-badge.oily {
  background: #E0F2FE;
  color: #0369A1;
}

.skin-type-badge.dry {
  background: #FEF3C7;
  color: #B45309;
}

.skin-type-badge.mixed {
  background: #F3E8FF;
  color: #7C3AED;
}

.skin-type-badge.sensitive {
  background: #FCE7F3;
  color: #BE185D;
}

.skin-type-badge.normal {
  background: #D1FAE5;
  color: #047857;
}

.result-section {
  margin-bottom: 20px;
}

.result-section h5 {
  font-size: 14px;
  font-weight: 700;
  color: #636E72;
  margin-bottom: 10px;
}

.feature-list {
  list-style: none;
  padding: 0;
}

.feature-list li {
  padding: 8px 0;
  padding-left: 20px;
  position: relative;
  color: #2D3436;
  font-size: 14px;
}

.feature-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #FF8E9E;
  font-weight: bold;
}

.problem-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.problem-tag {
  padding: 6px 14px;
  background: #FFF5F5;
  color: #FF8E9E;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.advice-text {
  font-size: 14px;
  line-height: 1.7;
  color: #636E72;
  background: #F9FAFB;
  padding: 16px;
  border-radius: 12px;
}

/* 化妆建议 */
.makeup-section {
  background: linear-gradient(135deg, #FFF5F5 0%, #FDF4FF 100%);
  padding: 16px;
  border-radius: 16px;
  margin-bottom: 20px;
}

.makeup-tips {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.makeup-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: white;
  padding: 12px;
  border-radius: 12px;
}

.makeup-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.makeup-content {
  flex: 1;
}

.makeup-title {
  font-size: 13px;
  font-weight: 800;
  color: #FF8E9E;
  margin-bottom: 4px;
}

.makeup-content p {
  font-size: 13px;
  line-height: 1.5;
  color: #636E72;
}

.use-result-btn {
  width: 100%;
  padding: 16px;
  background: #FF8E9E;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 8px;
}

/* 动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
