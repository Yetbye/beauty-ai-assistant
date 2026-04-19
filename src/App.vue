<template>
  <div class="app">
    <!-- 首屏 - 输入区域 -->
    <section class="hero-section" v-show="currentStep === 'input'">
      <!-- 悬浮博主照片墙 -->
      <div class="floating-avatars">
        <div class="avatar-scroll">
          <div class="avatar-track">
            <img v-for="(blogger, idx) in [...bloggers, ...bloggers]" :key="idx" :src="blogger.avatar" class="float-avatar" :alt="blogger.name" />
          </div>
        </div>
        <div class="avatar-hint">👆 多位美妆博主等你挑选</div>
      </div>

      <header class="header">
        <div class="logo">
          <div class="logo-icon">
            <span class="sparkle">✨</span>
          </div>
          <h1>BEAUTY <span class="highlight">AI</span></h1>
        </div>
        <div class="beta-badge">BETA</div>
      </header>

      <div class="hero-content">
        <div class="tag">🎙️ AI 美妆直播新体验</div>
        <h2 class="title">
          辩妆<br />
          <span class="gradient-text">直播间</span>
        </h2>
        <p class="subtitle">
          多 Agent 美妆博主分身帮你吵<br />
          多视角选出最适合你的产品决策
        </p>
      </div>

      <!-- 相机入口 -->
      <div class="camera-entry" @click="openCamera">
        <div class="camera-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="6" width="18" height="12" rx="2"/>
            <circle cx="12" cy="12" r="3"/>
            <path d="M8 6l1.5-2h5L16 6"/>
          </svg>
        </div>
        <span class="camera-text">拍照识别肤质</span>
        <span class="camera-hint">AI智能分析，精准推荐</span>
      </div>

      <!-- 消息输入框 -->
      <div class="chat-input-area">
        <div class="search-wrapper">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input 
              v-model="userInput" 
              type="text" 
              placeholder="例如：油痘肌怎么控油？最近换季总是长闭口..."
              @keyup.enter="startAnalysis"
            />
            <button class="send-btn" @click="startAnalysis" :disabled="isAnalyzing">
              <span v-if="!isAnalyzing" class="arrow">→</span>
              <span v-else class="loading-dot">...</span>
            </button>
          </div>
        </div>

        <div class="hot-tags">
          <button 
            v-for="tag in hotTags" 
            :key="tag"
            class="tag-btn"
            @click="quickInput(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </section>

    <!-- 滚动内容区域 -->
    <section class="scroll-content" v-show="currentStep !== 'input'" ref="scrollContainer">
      <!-- 用户问题展示 -->
      <div class="user-question-card" v-if="userQuestion">
        <div class="question-label">你的问题</div>
        <div class="question-text">{{ userQuestion }}</div>
      </div>

      <!-- 步骤1: 原理科普卡 -->
      <transition name="fade-up">
        <div class="content-section" v-if="currentStep === 'knowledge' || currentStep === 'mode' || currentStep === 'blogger' || currentStep === 'debate' || currentStep === 'result'">
          <div class="section-header">
            <span class="step-number">01</span>
            <h3>肤质原理科普</h3>
          </div>
          
          <div v-if="isLoadingKnowledge" class="loading-card">
            <div class="loading-spinner"></div>
            <p>AI正在分析您的肌肤问题...</p>
          </div>
          
          <div v-else-if="knowledgeData" class="knowledge-card">
            <div class="card-badge">💧 底层逻辑</div>
            <h4>{{ knowledgeData.title }}</h4>
            <p class="knowledge-content">{{ knowledgeData.content }}</p>
            
            <div class="misconception-box">
              <div class="warning-icon">⚡</div>
              <div class="warning-content">
                <div class="warning-label">常见误区</div>
                <p>{{ knowledgeData.misconception }}</p>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- 步骤2: 预算范围 -->
      <transition name="fade-up">
        <div class="content-section" v-if="currentStep === 'mode' || currentStep === 'blogger' || currentStep === 'debate' || currentStep === 'result'">
          <div class="section-header">
            <span class="step-number">02</span>
            <h3>预算范围</h3>
          </div>
          
          <div class="budget-card">
            <div class="budget-display">
              <span class="budget-label">预算上限</span>
              <span class="budget-value">¥{{ budgetRange }}</span>
            </div>
            
            <div class="slider-container">
              <input 
                type="range" 
                v-model="budgetRange" 
                min="50" 
                max="2000" 
                step="50"
                class="budget-slider"
              />
              <div class="slider-labels">
                <span>¥50</span>
                <span>¥500</span>
                <span>¥1000</span>
                <span>¥2000</span>
              </div>
            </div>
            
            <div class="budget-tags">
              <button 
                v-for="opt in budgetOptions" 
                :key="opt.value"
                class="budget-tag"
                :class="{ active: budgetRange === opt.value }"
                @click="budgetRange = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <!-- 步骤3: 肤质选择 -->
      <transition name="fade-up">
        <div class="content-section" v-if="currentStep === 'mode' || currentStep === 'blogger' || currentStep === 'debate' || currentStep === 'result'">
          <div class="section-header">
            <span class="step-number">03</span>
            <h3>肤质类型</h3>
          </div>
          
          <div class="skin-type-tabs">
            <button 
              v-for="type in skinTypes" 
              :key="type.id"
              class="skin-tab"
              :class="{ active: selectedSkinType === type.id }"
              @click="selectedSkinType = type.id"
            >
              <span class="tab-icon">{{ type.icon }}</span>
              <span class="tab-name">{{ type.name }}</span>
            </button>
          </div>
          
          <div class="skin-cards">
            <div 
              v-for="card in skinCards" 
              :key="card.id"
              class="skin-card"
              :class="{ selected: selectedSkinCard === card.id, [card.color]: true }"
              @click="selectSkinCard(card.id)"
            >
              <div class="card-indicator"></div>
              <h4>{{ card.title }}</h4>
              <p>{{ card.desc }}</p>
            </div>
          </div>
        </div>
      </transition>

      <!-- 步骤4: 模式选择 -->
      <transition name="fade-up">
        <div class="content-section mode-section" v-if="currentStep === 'mode' || currentStep === 'blogger' || currentStep === 'debate' || currentStep === 'result'">
          <div class="section-header">
            <span class="step-number">04</span>
            <h3>选择体验模式</h3>
          </div>
          
          <div class="mode-cards">
            <!-- 极速模式 -->
            <div class="mode-card fast" :class="{ selected: selectedMode === 'fast' }" @click="selectMode('fast')">
              <div class="mode-icon">⚡</div>
              <h4>极速模式</h4>
              <p class="mode-desc">十秒内为你生成适合的产品信息</p>
              <div class="mode-features">
                <span class="feature-tag">AI直接推荐</span>
                <span class="feature-tag">快速决策</span>
              </div>
              <div v-if="selectedMode === 'fast'" class="selected-indicator">✓</div>
            </div>

            <!-- 直播间模式 -->
            <div class="mode-card live" :class="{ selected: selectedMode === 'live' }" @click="selectMode('live')">
              <div class="mode-icon">🎙️</div>
              <h4>直播间模式</h4>
              <p class="mode-desc">参与多博主辩论，决策你的专属产品</p>
              <div class="mode-features">
                <span class="feature-tag">多博主辩论</span>
                <span class="feature-tag">多视角决策</span>
              </div>
              <div v-if="selectedMode === 'live'" class="selected-indicator">✓</div>
            </div>
          </div>

          <button 
            class="confirm-mode-btn"
            :disabled="!selectedMode"
            @click="confirmMode"
          >
            {{ selectedMode === 'fast' ? '立即获取推荐' : '进入直播间' }}
            <span class="arrow">→</span>
          </button>
        </div>
      </transition>

      <!-- 步骤5: 博主选择（仅直播间模式） -->
      <transition name="fade-up">
        <div class="content-section" v-if="currentStep === 'blogger' || currentStep === 'debate'">
          <div class="section-header">
            <span class="step-number">05</span>
            <h3>选择博主</h3>
          </div>
          
          <div class="blogger-filter-notice">
            <div class="notice-icon">🎯</div>
            <div class="notice-content">
              <div class="notice-title">针对你的信息，我为你筛选出了5个垂类博主分身</div>
              <p class="notice-desc">这些博主在{{ skinTypeLabels[selectedSkinType] }}护肤领域有丰富经验</p>
            </div>
          </div>
          
          <div class="selected-count">
            已选 {{ selectedBloggers.length }}/3
          </div>
          
          <div class="bloggers-grid">
            <div 
              v-for="blogger in filteredBloggers" 
              :key="blogger.id"
              class="blogger-card"
              :class="{ selected: selectedBloggers.includes(blogger.id) }"
              @click="toggleBlogger(blogger.id)"
            >
              <div v-if="selectedBloggers.includes(blogger.id)" class="check-badge">
                <span class="check">✓</span>
              </div>
              <img :src="blogger.avatar" class="blogger-avatar" :alt="blogger.name" />
              <div class="blogger-info">
                <h4>{{ blogger.name }}</h4>
                <span class="persona-tag">{{ blogger.persona }}</span>
              </div>
              <p class="blogger-quote">"{{ getShortQuote(blogger) }}"</p>
            </div>
          </div>
          
          <button 
            class="start-debate-btn"
            :disabled="selectedBloggers.length !== 3"
            @click="startDebate"
          >
            开始辩论直播
            <span class="arrow">→</span>
          </button>
        </div>
      </transition>

      <!-- 步骤6: 辩论直播 -->
      <transition name="fade-up">
        <div class="content-section debate-section" v-if="currentStep === 'debate'">
          <div class="section-header">
            <span class="step-number">06</span>
            <h3>博主辩论</h3>
          </div>
          
          <div class="livestream-container">
            <div class="live-bg"></div>
            
            <div class="live-header">
              <div class="live-badge">
                <span class="live-dot"></span>
                LIVE
              </div>
              <span class="viewer-count">👥 {{ viewers }} 观看</span>
            </div>
            
            <div class="messages-feed" ref="messagesRef">
              <div 
                v-for="(message, idx) in debateMessages" 
                :key="idx"
                class="message"
                :class="{ 'user-message': message.isUser }"
              >
                <img :src="message.avatar" class="msg-avatar" alt="" />
                <div class="msg-bubble">
                  <span class="msg-speaker">{{ message.speaker }}:</span>
                  <span class="msg-content">{{ message.content }}</span>
                </div>
              </div>
            </div>
            
            <!-- 用户输入 -->
            <div class="debate-input-area">
              <div class="input-box">
                <input 
                  v-model="userComment"
                  type="text"
                  :disabled="isSubmitting"
                  placeholder="说点什么，参与讨论..."
                  @keyup.enter="submitComment"
                />
                <button 
                  class="send-btn" 
                  :disabled="isSubmitting"
                  @click="submitComment"
                >
                  {{ isSubmitting ? '发送中...' : '发送' }}
                </button>
              </div>
              <button class="result-btn" @click="showResult">
                查看推荐商品
              </button>
            </div>
          </div>
        </div>
      </transition>

      <!-- 步骤7: 推荐结果 -->
      <transition name="fade-up">
        <div class="content-section result-section" v-if="currentStep === 'result'">
          <div class="section-header">
            <span class="step-number">07</span>
            <h3>推荐结果</h3>
          </div>
          
          <div v-if="isLoadingRecommendation" class="loading-card">
            <div class="loading-spinner"></div>
            <p>AI正在为你挑选最适合的产品...</p>
          </div>
          
          <div v-else-if="recommendation" class="result-card">
            <div class="success-badge">✓</div>
            <h4>为你挑到宝啦！</h4>
            
            <div class="recommendation-source" v-if="recommendation.mode === 'fast'">
              <span class="source-tag">⚡ 极速推荐</span>
            </div>
            <div class="recommendation-source" v-else>
              <span class="source-tag">🎙️ 博主共识</span>
            </div>
            
            <div class="product-showcase">
              <img :src="recommendation.primary.image" :alt="recommendation.primary.name" />
            </div>
            
            <div class="product-info">
              <div class="product-tags">
                <span class="tag brand">{{ recommendation.primary.brand }}</span>
                <span class="tag official">官方授权</span>
              </div>
              <h5 class="product-name">{{ recommendation.primary.name }}</h5>
              <div class="product-price">
                ¥{{ recommendation.primary.price }}
                <span class="price-label">官方直播价</span>
              </div>
              
              <div class="consensus-box">
                <div class="consensus-label">{{ recommendation.mode === 'fast' ? 'AI推荐依据' : '辩论达成共识' }}</div>
                <p>{{ recommendation.primary.reason }}</p>
              </div>
            </div>
            
            <button class="buy-btn" @click="goToProduct">
              立即购买
            </button>
          </div>
          
          <button class="restart-btn" @click="restart">
            重新咨询
          </button>
        </div>
      </transition>
    </section>

    <!-- 肤质分析相机组件 -->
    <SkinAnalysisCamera
      v-model="showCamera"
      @analysis-complete="handleSkinAnalysis"
    />
  </div>
</template>

<script setup>
import { ref, nextTick, watch, computed } from 'vue'
import { BLOGGERS } from './agent/bloggers.js'
import { apiClient } from './agent/api-client.js'
import SkinAnalysisCamera from './components/SkinAnalysisCamera.vue'

// 状态
const currentStep = ref('input')
const userInput = ref('')
const userQuestion = ref('')
const isAnalyzing = ref(false)
const isLoadingKnowledge = ref(false)
const isLoadingRecommendation = ref(false)
const knowledgeData = ref(null)
const budgetRange = ref(500)
const selectedSkinType = ref('oily')
const selectedSkinCard = ref('A')
const selectedMode = ref('')
const selectedBloggers = ref([])
const debateMessages = ref([])
const userComment = ref('')
const isSubmitting = ref(false)
const viewers = ref(1280)
const recommendation = ref(null)
const showCamera = ref(false)
const scrollContainer = ref(null)
const messagesRef = ref(null)

// 数据
const hotTags = ['200元平替', '油痘肌必看', '敏肌救星', '早C晚A']

const budgetOptions = [
  { label: '学生党', value: 200 },
  { label: '平价', value: 500 },
  { label: '中端', value: 1000 },
  { label: '贵妇', value: 2000 }
]

const skinTypes = [
  { id: 'oily', name: '油性', icon: '💧' },
  { id: 'dry', name: '干性', icon: '🌵' },
  { id: 'mixed', name: '混合', icon: '⚖️' },
  { id: 'sensitive', name: '敏感', icon: '🌸' }
]

const skinTypeLabels = {
  oily: '油性肌肤',
  dry: '干性肌肤',
  mixed: '混合肌肤',
  sensitive: '敏感肌肤'
}

const skinCards = [
  { id: 'A', title: '控油祛痘', desc: '针对油痘肌，快速见效', color: 'emerald' },
  { id: 'B', title: '温和修护', desc: '屏障修复，维稳为主', color: 'orange' },
  { id: 'C', title: '抗老提亮', desc: '抗氧化，提亮肤色', color: 'indigo' }
]

const bloggers = BLOGGERS

// 根据肤质筛选博主（模拟筛选逻辑）
const filteredBloggers = computed(() => {
  // 返回前5个博主作为筛选结果
  return bloggers.slice(0, 5)
})

// 方法
const quickInput = (tag) => {
  userInput.value = tag
}

const openCamera = () => {
  showCamera.value = true
}

const closeCamera = () => {
  showCamera.value = false
}

const startAnalysis = async () => {
  if (!userInput.value.trim() || isAnalyzing.value) return
  
  isAnalyzing.value = true
  userQuestion.value = userInput.value
  currentStep.value = 'knowledge'
  
  // 滚动到内容区域
  await nextTick()
  scrollToContent()
  
  // 加载知识科普
  isLoadingKnowledge.value = true
  try {
    knowledgeData.value = await apiClient.generateKnowledge(userQuestion.value)
  } catch (error) {
    console.error('Failed to generate knowledge:', error)
    knowledgeData.value = {
      title: '护肤知识科普',
      content: '针对您的肌肤问题，建议从清洁、保湿、修护三个维度入手。',
      misconception: '误区：护肤品越贵越好。真相：适合自己的才是最好的。'
    }
  }
  isLoadingKnowledge.value = false
  
  // 延迟显示预算范围
  setTimeout(() => {
    currentStep.value = 'budget'
    scrollToContent()
  }, 800)
  
  // 延迟显示肤质选择
  setTimeout(() => {
    currentStep.value = 'mode'
    scrollToContent()
  }, 1600)
  
  isAnalyzing.value = false
}

const scrollToContent = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

const selectSkinCard = (id) => {
  selectedSkinCard.value = id
}

const selectMode = (mode) => {
  selectedMode.value = mode
}

const confirmMode = async () => {
  if (selectedMode.value === 'fast') {
    // 极速模式：直接获取推荐
    currentStep.value = 'result'
    await nextTick()
    scrollToContent()
    
    isLoadingRecommendation.value = true
    try {
      const result = await apiClient.generateRecommendation([], userQuestion.value)
      result.mode = 'fast'
      recommendation.value = result
    } catch (error) {
      console.error('Fast recommendation error:', error)
      recommendation.value = {
        mode: 'fast',
        primary: {
          id: 'P001',
          name: '理肤泉B5修复霜',
          brand: '理肤泉',
          price: 89,
          image: 'https://via.placeholder.com/300x300/FF9A9E/FFFFFF?text=La+Roche-Posay',
          reason: '根据您的肌肤问题和预算，这款修复霜含有高浓度维生素B5，能够有效舒缓肌肤，修复屏障。十秒极速推荐完成！'
        }
      }
    }
    isLoadingRecommendation.value = false
  } else {
    // 直播间模式：进入博主选择
    currentStep.value = 'blogger'
    await nextTick()
    scrollToContent()
  }
}

const toggleBlogger = (id) => {
  const index = selectedBloggers.value.indexOf(id)
  if (index > -1) {
    selectedBloggers.value.splice(index, 1)
  } else if (selectedBloggers.value.length < 3) {
    selectedBloggers.value.push(id)
  }
}

const getShortQuote = (blogger) => {
  const quotes = {
    'C001': '买它！买它！',
    'C002': '从成分角度分析...',
    'C003': '底层逻辑是...',
    'C004': '你现在的问题是...',
    'C005': '真的！这个真的很好看！',
    'C006': '这是原相机效果',
    'C007': '整体会有一种很干净的感觉'
  }
  return quotes[blogger.id] || '专业推荐'
}

const startDebate = async () => {
  if (selectedBloggers.value.length !== 3) return
  
  currentStep.value = 'debate'
  debateMessages.value = []
  
  await nextTick()
  scrollToContent()
  
  const selectedBloggerObjects = bloggers.filter(b => selectedBloggers.value.includes(b.id))
  
  // 并行调用三个博主的API
  const debatePromises = selectedBloggerObjects.map(async (blogger, index) => {
    try {
      const response = await apiClient.generateDebate(
        blogger.id,
        userQuestion.value,
        1,
        [],
        index % 3
      )
      
      return {
        round: 1,
        speaker: blogger.name,
        speakerId: blogger.id,
        content: response.content,
        avatar: blogger.avatar
      }
    } catch (error) {
      console.error(`Debate error for ${blogger.name}:`, error)
      return {
        round: 1,
        speaker: blogger.name,
        speakerId: blogger.id,
        content: '这个观点很有意思，让我想想...',
        avatar: blogger.avatar
      }
    }
  })
  
  // 等待所有博主回复
  const messages = await Promise.all(debatePromises)
  
  // 按顺序添加到消息列表
  for (const message of messages) {
    debateMessages.value.push(message)
    await new Promise(resolve => setTimeout(resolve, 300))
    scrollToBottom()
  }
}

const submitComment = async () => {
  if (!userComment.value.trim() || isSubmitting.value) return
  
  isSubmitting.value = true
  const comment = userComment.value.trim()
  userComment.value = ''
  
  debateMessages.value.push({
    round: 99,
    speaker: '我',
    speakerId: 'user',
    content: comment,
    avatar: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23FF8E9E"/></svg>',
    isUser: true
  })
  
  scrollToBottom()
  
  const selectedBloggerObjects = bloggers.filter(b => selectedBloggers.value.includes(b.id))
  
  // 并行获取所有博主的回应
  const responsePromises = selectedBloggerObjects.map(async (blogger, index) => {
    try {
      const response = await apiClient.generateResponse(
        blogger.id,
        comment,
        userQuestion.value,
        index % 3
      )
      
      return {
        round: 99,
        speaker: blogger.name,
        speakerId: blogger.id,
        content: response.content,
        avatar: blogger.avatar
      }
    } catch (error) {
      console.error(`Response error for ${blogger.name}:`, error)
      return {
        round: 99,
        speaker: blogger.name,
        speakerId: blogger.id,
        content: '感谢你的分享！',
        avatar: blogger.avatar
      }
    }
  })
  
  // 等待所有回应
  const responses = await Promise.all(responsePromises)
  
  // 依次显示回应
  for (const response of responses) {
    debateMessages.value.push(response)
    await new Promise(resolve => setTimeout(resolve, 200))
    scrollToBottom()
  }
  
  isSubmitting.value = false
}

const showResult = async () => {
  currentStep.value = 'result'
  
  await nextTick()
  scrollToContent()
  
  isLoadingRecommendation.value = true
  
  try {
    const result = await apiClient.generateRecommendation(
      selectedBloggers.value,
      userQuestion.value
    )
    result.mode = 'live'
    recommendation.value = result
  } catch (error) {
    console.error('Failed to generate recommendation:', error)
    // 使用默认推荐
    recommendation.value = {
      mode: 'live',
      primary: {
        id: 'P001',
        name: '理肤泉B5修复霜',
        brand: '理肤泉',
        price: 89,
        image: 'https://via.placeholder.com/300x300/FF9A9E/FFFFFF?text=La+Roche-Posay',
        reason: '经过三位博主的激烈辩论，一致认为这款修复霜最适合解决您的肌肤问题。'
      }
    }
  }
  
  isLoadingRecommendation.value = false
}

const goToProduct = () => {
  alert('跳转到商品详情页')
}

const restart = () => {
  currentStep.value = 'input'
  userInput.value = ''
  userQuestion.value = ''
  knowledgeData.value = null
  budgetRange.value = 500
  selectedSkinType.value = 'oily'
  selectedSkinCard.value = 'A'
  selectedMode.value = ''
  selectedBloggers.value = []
  debateMessages.value = []
  userComment.value = ''
  recommendation.value = null
}

// 处理肤质分析结果
const handleSkinAnalysis = (result) => {
  // 根据分析结果设置肤质类型
  if (result.skinType) {
    selectedSkinType.value = result.skinType
  }
  
  // 将分析结果作为用户问题
  const analysisText = result.description || 
    `我的肤质是${skinTypeLabels[result.skinType] || '混合肌肤'}，主要问题是${result.problems?.join('、') || '水油不平衡'}，${result.advice || '需要专业建议'}`
  
  userInput.value = analysisText
  
  // 自动开始分析
  startAnalysis()
}

watch(debateMessages, () => {
  scrollToBottom()
}, { deep: true })
</script>

<style scoped>
.app {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(180deg, #FDF4FF 0%, #FFF5F5 100%);
}

/* 悬浮博主照片墙 */
.floating-avatars {
  position: absolute;
  top: 80px;
  left: 0;
  right: 0;
  overflow: hidden;
  padding: 10px 0;
}

.avatar-scroll {
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent);
}

.avatar-track {
  display: flex;
  gap: 12px;
  animation: scroll 20s linear infinite;
  width: max-content;
}

@keyframes scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.float-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  object-fit: cover;
  flex-shrink: 0;
}

.avatar-hint {
  text-align: center;
  font-size: 12px;
  color: #FF8E9E;
  margin-top: 8px;
  font-weight: 600;
}

/* 首屏样式 */
.hero-section {
  min-height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
  position: relative;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 100px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #FF9A9E, #FAD0C4);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(3deg);
}

.sparkle {
  font-size: 20px;
}

.logo h1 {
  font-size: 20px;
  font-weight: 900;
  color: #2D3436;
}

.highlight {
  color: #FF8E9E;
}

.beta-badge {
  background: #FFDE59;
  color: #2D3436;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 900;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);
}

.hero-content {
  text-align: center;
  margin-bottom: 30px;
}

.tag {
  display: inline-block;
  background: white;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  color: #FF8E9E;
  border: 2px solid #FFC1CC;
  margin-bottom: 20px;
}

.title {
  font-size: 48px;
  font-weight: 900;
  color: #2D3436;
  line-height: 1.1;
  margin-bottom: 16px;
}

.gradient-text {
  color: #FF8E9E;
  border-bottom: 4px solid rgba(255, 142, 158, 0.3);
}

.subtitle {
  font-size: 14px;
  color: #636E72;
  font-weight: 600;
  line-height: 1.8;
}

/* 相机入口 */
.camera-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: white;
  border-radius: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-bottom: 4px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s;
}

.camera-entry:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.camera-entry:active {
  transform: translateY(0);
  border-bottom-width: 2px;
}

.camera-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #FF9A9E, #FAD0C4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-icon svg {
  width: 28px;
  height: 28px;
  color: white;
}

.camera-text {
  font-size: 16px;
  font-weight: 700;
  color: #2D3436;
}

.camera-hint {
  font-size: 12px;
  color: #636E72;
}

/* 聊天输入区域 */
.chat-input-area {
  margin-top: auto;
}

.search-wrapper {
  position: relative;
  margin-bottom: 16px;
}

.search-wrapper::before {
  content: '';
  position: absolute;
  inset: -8px;
  background: linear-gradient(135deg, #FF9A9E, #FEB692);
  border-radius: 36px;
  opacity: 0.2;
  filter: blur(20px);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border-radius: 28px;
  padding: 6px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-bottom: 4px solid rgba(0, 0, 0, 0.08);
}

.search-icon {
  font-size: 20px;
  margin-left: 20px;
  margin-right: 12px;
}

.search-box input {
  flex: 1;
  border: none;
  padding: 16px 0;
  font-size: 16px;
  font-weight: 600;
  outline: none;
  background: transparent;
}

.search-box input::placeholder {
  color: #ccc;
}

.send-btn {
  width: 50px;
  height: 50px;
  background: #FF8E9E;
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.1s;
}

.send-btn:hover {
  transform: scale(1.05);
}

.send-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.1);
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.hot-tags {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.tag-btn {
  padding: 12px 24px;
  background: white;
  border: none;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 700;
  color: #636E72;
  border-bottom: 4px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s;
}

.tag-btn:hover {
  background: #f8f8f8;
  border-color: rgba(0, 0, 0, 0.1);
}

.tag-btn:active {
  transform: translateY(2px);
  border-bottom-width: 2px;
}

/* 滚动内容区域 */
.scroll-content {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.user-question-card {
  background: white;
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.question-label {
  font-size: 11px;
  font-weight: 900;
  color: #FF8E9E;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.question-text {
  font-size: 16px;
  font-weight: 700;
  color: #2D3436;
}

/* 内容区块 */
.content-section {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.step-number {
  width: 36px;
  height: 36px;
  background: #FF8E9E;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 900;
}

.section-header h3 {
  font-size: 20px;
  font-weight: 800;
  color: #2D3436;
}

.section-desc {
  font-size: 14px;
  color: #636E72;
  margin-left: auto;
}

/* 知识卡片 */
.loading-card {
  background: white;
  padding: 40px;
  border-radius: 24px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 142, 158, 0.2);
  border-top-color: #FF8E9E;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.knowledge-card {
  background: white;
  padding: 28px;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.card-badge {
  display: inline-block;
  background: #EBF5FF;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 800;
  color: #0066CC;
  margin-bottom: 16px;
}

.knowledge-card h4 {
  font-size: 22px;
  font-weight: 800;
  color: #2D3436;
  margin-bottom: 12px;
}

.knowledge-content {
  font-size: 15px;
  line-height: 1.7;
  color: #636E72;
  margin-bottom: 20px;
}

.misconception-box {
  background: #FFDE59;
  padding: 20px;
  border-radius: 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.warning-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.warning-label {
  font-size: 10px;
  font-weight: 900;
  color: rgba(0, 0, 0, 0.4);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 4px;
}

.warning-content p {
  font-size: 14px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  line-height: 1.5;
}

/* 预算卡片 */
.budget-card {
  background: white;
  padding: 28px;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.budget-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.budget-label {
  font-size: 14px;
  font-weight: 700;
  color: #636E72;
}

.budget-value {
  font-size: 32px;
  font-weight: 900;
  color: #FF8E9E;
}

.slider-container {
  margin-bottom: 20px;
}

.budget-slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #E8E8E8;
  outline: none;
  -webkit-appearance: none;
  margin-bottom: 8px;
}

.budget-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #FF8E9E;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(255, 142, 158, 0.4);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #636E72;
}

.budget-tags {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.budget-tag {
  padding: 10px 20px;
  background: #f8f8f8;
  border: 2px solid transparent;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  color: #636E72;
  cursor: pointer;
  transition: all 0.2s;
}

.budget-tag.active,
.budget-tag:hover {
  background: #FF8E9E;
  color: white;
}

/* 肤质选择 */
.skin-type-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.skin-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border: 2px solid transparent;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 700;
  color: #636E72;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.skin-tab.active {
  background: #FF8E9E;
  color: white;
  border-color: #FF8E9E;
}

.tab-icon {
  font-size: 18px;
}

.skin-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.skin-card {
  background: white;
  padding: 20px;
  border-radius: 16px;
  border: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.skin-card:hover {
  transform: translateY(-2px);
}

.skin-card.selected {
  border-color: #FFDE59;
  box-shadow: 0 0 0 4px rgba(255, 222, 89, 0.2);
}

.card-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  opacity: 0.3;
}

.skin-card.emerald .card-indicator { background: #10B981; }
.skin-card.orange .card-indicator { background: #F97316; }
.skin-card.indigo .card-indicator { background: #6366F1; }

.skin-card h4 {
  font-size: 16px;
  font-weight: 800;
  color: #2D3436;
  margin-bottom: 4px;
}

.skin-card p {
  font-size: 12px;
  color: #636E72;
}

/* 模式选择 */
.mode-section {
  margin-bottom: 30px;
}

.mode-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.mode-card {
  background: white;
  padding: 28px 20px;
  border-radius: 24px;
  text-align: center;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.3s;
  position: relative;
}

.mode-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}

.mode-card.selected {
  border-color: #FFDE59;
  box-shadow: 0 0 0 4px rgba(255, 222, 89, 0.2);
}

.mode-card.fast {
  background: linear-gradient(135deg, #fff 0%, #f0fdf4 100%);
}

.mode-card.live {
  background: linear-gradient(135deg, #fff 0%, #fdf4ff 100%);
}

.mode-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.mode-card h4 {
  font-size: 18px;
  font-weight: 800;
  color: #2D3436;
  margin-bottom: 8px;
}

.mode-desc {
  font-size: 13px;
  color: #636E72;
  margin-bottom: 16px;
  line-height: 1.5;
}

.mode-features {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.feature-tag {
  padding: 6px 12px;
  background: rgba(255, 142, 158, 0.1);
  color: #FF8E9E;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
}

.selected-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  background: #FFDE59;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 900;
  color: #2D3436;
}

.confirm-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 18px;
  background: #2D3436;
  color: white;
  border: none;
  border-radius: 28px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.1s;
}

.confirm-mode-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  box-shadow: none;
}

.confirm-mode-btn:not(:disabled):hover {
  background: #000;
}

.confirm-mode-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.1);
}

/* 博主筛选提示 */
.blogger-filter-notice {
  background: linear-gradient(135deg, #EBF5FF 0%, #F0F9FF 100%);
  padding: 20px;
  border-radius: 20px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 20px;
  border: 2px solid rgba(0, 102, 204, 0.1);
}

.notice-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.notice-title {
  font-size: 15px;
  font-weight: 800;
  color: #2D3436;
  margin-bottom: 4px;
}

.notice-desc {
  font-size: 13px;
  color: #636E72;
}

/* 博主选择 */
.selected-count {
  text-align: right;
  font-size: 14px;
  font-weight: 700;
  color: #FF8E9E;
  margin-bottom: 16px;
}

.bloggers-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.blogger-card {
  background: white;
  padding: 20px;
  border-radius: 20px;
  text-align: center;
  cursor: pointer;
  position: relative;
  border: 3px solid transparent;
  transition: all 0.3s;
}

.blogger-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}

.blogger-card.selected {
  border-color: #FFDE59;
  box-shadow: 0 0 0 4px rgba(255, 222, 89, 0.2);
  transform: scale(1.02);
}

.check-badge {
  position: absolute;
  top: 0;
  right: 0;
  width: 40px;
  height: 40px;
  background: #FFDE59;
  clip-path: polygon(0 0, 100% 0, 100% 100%);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 6px;
}

.check {
  font-size: 12px;
  font-weight: 900;
  color: #2D3436;
}

.blogger-avatar {
  width: 60px;
  height: 60px;
  border-radius: 20px;
  object-fit: cover;
  border: 3px solid white;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  margin-bottom: 12px;
}

.blogger-info h4 {
  font-size: 15px;
  font-weight: 800;
  color: #2D3436;
  margin-bottom: 4px;
}

.persona-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  color: #FFDE59;
  background: rgba(255, 222, 89, 0.15);
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.blogger-quote {
  font-size: 11px;
  color: #636E72;
  margin-top: 8px;
  font-style: italic;
}

.start-debate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 18px;
  background: #2D3436;
  color: white;
  border: none;
  border-radius: 28px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.1s;
}

.start-debate-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  box-shadow: none;
}

.start-debate-btn:not(:disabled):hover {
  background: #000;
}

.start-debate-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.1);
}

/* 辩论区域 */
.debate-section {
  margin-bottom: 40px;
}

.livestream-container {
  position: relative;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
  border-radius: 24px;
  overflow: hidden;
  min-height: 500px;
}

.live-bg {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at 20% 20%, rgba(255, 142, 158, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(255, 222, 89, 0.1) 0%, transparent 50%);
}

.live-header {
  position: relative;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #FF0050;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1px;
}

.live-dot {
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.viewer-count {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 600;
}

.messages-feed {
  position: relative;
  height: 350px;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 85%;
}

.message.user-message {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.user-message .msg-bubble {
  background: #FF8E9E;
}

.msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid white;
  flex-shrink: 0;
}

.msg-bubble {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  padding: 12px 16px;
  border-radius: 16px;
  border-top-left-radius: 4px;
}

.msg-speaker {
  color: #FFDE59;
  font-size: 11px;
  font-weight: 800;
  margin-right: 8px;
}

.msg-content {
  color: white;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.debate-input-area {
  position: relative;
  padding: 16px;
  background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%);
  z-index: 10;
}

.debate-input-area .input-box {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.debate-input-area input {
  flex: 1;
  height: 44px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 22px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 600;
  outline: none;
}

.debate-input-area .send-btn {
  padding: 0 20px;
  height: 44px;
  background: #FF8E9E;
  color: white;
  border: none;
  border-radius: 22px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);
}

.result-btn {
  width: 100%;
  padding: 14px;
  background: #FFDE59;
  color: #2D3436;
  border: none;
  border-radius: 22px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);
}

/* 结果区域 */
.result-section {
  margin-bottom: 40px;
}

.result-card {
  background: white;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  text-align: center;
  padding-bottom: 24px;
}

.success-badge {
  width: 60px;
  height: 60px;
  background: #58CC02;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  margin: 24px auto 16px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);
}

.result-card h4 {
  font-size: 24px;
  font-weight: 900;
  color: #2D3436;
  margin-bottom: 12px;
}

.recommendation-source {
  margin-bottom: 16px;
}

.source-tag {
  display: inline-block;
  padding: 8px 16px;
  background: linear-gradient(135deg, #FF9A9E, #FAD0C4);
  color: white;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 800;
}

.product-showcase {
  height: 200px;
  background: linear-gradient(135deg, #FF9A9E, #FAD0C4);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.product-showcase img {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  border: 4px solid white;
}

.product-info {
  padding: 0 24px;
}

.product-tags {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.tag {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 800;
}

.tag.brand {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.tag.official {
  background: #FFDE59;
  color: #2D3436;
}

.product-name {
  font-size: 18px;
  font-weight: 800;
  color: #2D3436;
  margin-bottom: 8px;
}

.product-price {
  font-size: 28px;
  font-weight: 900;
  color: #FF8E9E;
  margin-bottom: 16px;
}

.price-label {
  font-size: 12px;
  font-weight: 600;
  color: #636E72;
  margin-left: 8px;
}

.consensus-box {
  background: rgba(88, 204, 2, 0.1);
  border: 2px solid rgba(88, 204, 2, 0.2);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: left;
}

.consensus-label {
  font-size: 11px;
  font-weight: 900;
  color: #58CC02;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.consensus-box p {
  font-size: 13px;
  line-height: 1.6;
  color: #636E72;
  font-weight: 600;
}

.buy-btn {
  width: calc(100% - 48px);
  margin: 0 24px;
  padding: 16px;
  background: #FF8E9E;
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);
}

.restart-btn {
  display: block;
  width: 100%;
  margin-top: 20px;
  padding: 16px;
  background: transparent;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 24px;
  font-size: 14px;
  font-weight: 700;
  color: #636E72;
  cursor: pointer;
  transition: all 0.2s;
}

.restart-btn:hover {
  border-color: #2D3436;
  color: #2D3436;
}

/* 相机弹窗 */
.camera-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.camera-content {
  background: white;
  border-radius: 24px;
  overflow: hidden;
  width: 100%;
  max-width: 400px;
}

.camera-preview {
  aspect-ratio: 3/4;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-placeholder {
  text-align: center;
  color: white;
}

.camera-placeholder svg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.camera-placeholder p {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
}

.camera-placeholder .hint {
  font-size: 12px;
  opacity: 0.7;
}

.close-camera {
  width: 100%;
  padding: 16px;
  background: #FF8E9E;
  color: white;
  border: none;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

/* 动画 */
.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.5s ease;
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.fade-up-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* 响应式 */
@media (max-width: 480px) {
  .title {
    font-size: 36px;
  }
  
  .mode-cards {
    grid-template-columns: 1fr;
  }
  
  .bloggers-grid {
    grid-template-columns: 1fr;
  }
  
  .skin-cards {
    grid-template-columns: 1fr;
  }
  
  .floating-avatars {
    top: 70px;
  }
  
  .float-avatar {
    width: 44px;
    height: 44px;
  }
}
</style>
