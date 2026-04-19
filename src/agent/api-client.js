// API 客户端 - 调用后端服务（保护API Key）
const API_BASE = import.meta.env.VITE_API_BASE || ''

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}/api${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return response.json()
  }

  // 获取博主列表
  async getBloggers() {
    return this.request('/bloggers')
  }

  // 生成知识科普
  async generateKnowledge(question) {
    return this.request('/knowledge', {
      method: 'POST',
      body: JSON.stringify({ question })
    })
  }

  // 生成辩论内容
  async generateDebate(bloggerId, question, round, previousPoints, apiKeyIndex) {
    return this.request('/debate', {
      method: 'POST',
      body: JSON.stringify({
        bloggerId,
        question,
        round,
        previousPoints,
        apiKeyIndex
      })
    })
  }

  // 生成用户回应
  async generateResponse(bloggerId, userComment, question, apiKeyIndex) {
    return this.request('/respond', {
      method: 'POST',
      body: JSON.stringify({
        bloggerId,
        userComment,
        question,
        apiKeyIndex
      })
    })
  }

  // 生成推荐
  async generateRecommendation(bloggerIds, question) {
    return this.request('/recommend', {
      method: 'POST',
      body: JSON.stringify({
        bloggerIds,
        question
      })
    })
  }

  // 肤质分析（多模态）
  async analyzeSkin(base64Image) {
    return this.request('/analyze-skin', {
      method: 'POST',
      body: JSON.stringify({
        image: base64Image
      })
    })
  }
}

export const apiClient = new ApiClient()
