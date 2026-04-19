// API 配置 - 三个API Key轮询
const API_CONFIG = {
  url: 'https://api.longcat.chat/openai/v1/chat/completions',
  model: 'LongCat-Flash-Lite',
  keys: [
    'ak_2tf2il7sp1yb4c887T7MK9U71tY1K',
    'ak_2LE5Ci53W8TP3MX7lb7AW4as6sF0G',
    'ak_2ud5LY5hR99w7Ol9az7jo1jT67S2e'
  ]
}

// 商品数据
const MOCK_PRODUCTS = [
  {
    id: 'beauty-001',
    name: 'YSL圣罗兰小金条口红 #21',
    brand: 'YSL圣罗兰',
    price: 350,
    cover: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=400&fit=crop',
    tags: ['显白', '哑光', '持久'],
    description: '复古蓝调红，显白不挑皮'
  },
  {
    id: 'beauty-002',
    name: '雅诗兰黛小棕瓶精华 50ml',
    brand: 'Estee Lauder',
    price: 850,
    cover: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop',
    tags: ['修护', '抗老', '维稳'],
    description: '第七代小棕瓶，修护肌底'
  },
  {
    id: 'beauty-003',
    name: '兰蔻持妆粉底液 PO-01',
    brand: 'Lancome',
    price: 420,
    cover: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop',
    tags: ['持妆', '控油', '遮瑕'],
    description: '24小时持妆，油皮亲妈'
  },
  {
    id: 'beauty-004',
    name: 'SK-II神仙水 230ml',
    brand: 'SK-II',
    price: 1540,
    cover: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=400&h=400&fit=crop',
    tags: ['提亮', '细腻', 'Pitera'],
    description: '经典神仙水，改善肤质'
  },
  {
    id: 'beauty-005',
    name: '花西子散粉 01肤若雪',
    brand: '花西子',
    price: 149,
    cover: 'https://images.unsplash.com/photo-1631214524115-6f8eb1beb6c4?w=400&h=400&fit=crop',
    tags: ['定妆', '控油', '国货'],
    description: '空气蜜粉，柔焦定妆'
  }
]

class DebateService {
  // 获取API Key
  getApiKey(index) {
    return API_CONFIG.keys[index % API_CONFIG.keys.length]
  }

  // 非流式调用
  async callLLM(messages, temperature = 0.8, maxTokens = 800, apiKeyIndex = 0) {
    const apiKey = this.getApiKey(apiKeyIndex)
    
    const response = await fetch(API_CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: API_CONFIG.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  }

  // 流式调用
  async *streamLLM(messages, temperature = 0.8, maxTokens = 800, apiKeyIndex = 0) {
    const apiKey = this.getApiKey(apiKeyIndex)
    
    const response = await fetch(API_CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: API_CONFIG.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        
        const data = trimmed.slice(6)
        if (data === '[DONE]') return

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) yield content
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  }

  // 生成知识科普
  async generateKnowledge(userQuestion) {
    const messages = [
      {
        role: 'system',
        content: '你是一位专业的美妆护肤科普专家。'
      },
      {
        role: 'user',
        content: `用户问题："${userQuestion}"

请生成知识科普内容，包含：
1. 标题：简洁明了（15字以内）
2. 原理：科学原理，150字以内
3. 误区：常见误区和真相（80字以内）

以JSON格式输出：
{
  "title": "...",
  "content": "...",
  "misconception": "..."
}`
      }
    ]

    try {
      const response = await this.callLLM(messages, 0.7, 600, 0)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) return JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error('Knowledge error:', error)
    }

    // 降级
    return this.getFallbackKnowledge(userQuestion)
  }

  getFallbackKnowledge(question) {
    const q = question.toLowerCase()
    if (q.includes('油') || q.includes('痘')) {
      return {
        title: '油痘肌控油祛痘原理',
        content: '油痘肌的核心在于皮脂腺分泌过盛与毛孔导管角化异常。控油应不仅停留在表层吸附，更需通过抑制5α-还原酶活性来减少油脂产生。',
        misconception: '误区：油皮不需要补水。真相：过度控油会破坏皮脂膜，水油平衡才是关键。'
      }
    }
    return {
      title: '科学护肤基础',
      content: '科学护肤的核心是了解皮肤结构和需求，针对性地选择产品。基础护肤包括清洁、保湿、防晒三大步骤。',
      misconception: '误区：护肤品越多越好。真相：精简高效的护肤方案往往更适合。'
    }
  }

  // 流式辩论
  async *streamDebate(selectedBloggers, userQuestion) {
    const products = MOCK_PRODUCTS
    
    for (let roundNum = 1; roundNum <= 2; roundNum++) {
      const previousPoints = []
      
      for (let i = 0; i < selectedBloggers.length; i++) {
        const blogger = selectedBloggers[i]
        
        // 先返回占位
        yield {
          round: roundNum,
          speaker: blogger.name,
          speakerId: blogger.id,
          content: '',
          avatar: blogger.avatar,
          isStreaming: true
        }

        // 生成内容
        let fullContent = ''
        try {
          for await (const chunk of this.streamDebatePoint(
            blogger, userQuestion, products, previousPoints, roundNum, i
          )) {
            fullContent += chunk
            yield {
              round: roundNum,
              speaker: blogger.name,
              speakerId: blogger.id,
              content: fullContent,
              avatar: blogger.avatar,
              isStreaming: true
            }
          }
        } catch (error) {
          fullContent = this.getFallbackResponse(blogger, products, roundNum)
          yield {
            round: roundNum,
            speaker: blogger.name,
            speakerId: blogger.id,
            content: fullContent,
            avatar: blogger.avatar,
            isStreaming: false
          }
        }

        yield {
          round: roundNum,
          speaker: blogger.name,
          speakerId: blogger.id,
          content: fullContent,
          avatar: blogger.avatar,
          isStreaming: false
        }

        previousPoints.push(`${blogger.name}: ${fullContent}`)
        await new Promise(r => setTimeout(r, 300))
      }
    }
  }

  async *streamDebatePoint(blogger, userQuestion, products, previousPoints, round, apiKeyIndex) {
    const productList = products.slice(0, 3).map(p => `- ${p.name}（${p.brand}）`).join('\n')
    const previous = previousPoints.length > 0 ? `之前的观点：\n${previousPoints.join('\n')}` : '这是第一轮辩论。'

    const messages = [
      {
        role: 'system',
        content: `${blogger.character_prompt}

【任务】用户问题：${userQuestion}
这是第${round}轮辩论。

【商品】
${productList}

要求：
1. 用第一人称"我"
2. 体现人设特点
3. 60字以内
4. 不要重复之前内容`
      },
      {
        role: 'user',
        content: `${previous}\n\n请发表你的观点：`
      }
    ]

    try {
      for await (const chunk of this.streamLLM(messages, 0.9, 150, apiKeyIndex)) {
        yield chunk
      }
    } catch (error) {
      yield this.getFallbackResponse(blogger, products, round)
    }
  }

  // 用户回应
  async *streamUserResponse(blogger, userComment, userQuestion, apiKeyIndex) {
    const messages = [
      {
        role: 'system',
        content: `${blogger.character_prompt}

用户问题：${userQuestion}
用户评论："${userComment}"

请回应用户的评论，50字以内。`
      },
      {
        role: 'user',
        content: '请回应：'
      }
    ]

    try {
      for await (const chunk of this.streamLLM(messages, 0.9, 150, apiKeyIndex)) {
        yield chunk
      }
    } catch (error) {
      yield '感谢你的分享！'
    }
  }

  // 生成推荐
  async generateRecommendation(selectedBloggers, userQuestion) {
    const products = MOCK_PRODUCTS
    const primary = products[0]
    const secondary = products[1]

    return {
      primary: {
        name: primary.name,
        brand: primary.brand,
        price: primary.price,
        reason: `综合${selectedBloggers.map(b => b.name).join('、')}等博主的建议，${primary.name}最适合解决您的${userQuestion}问题。从专业角度分析安全可靠，性价比高值得入手。`,
        image: primary.cover,
        productId: primary.id
      },
      secondary: {
        name: secondary.name,
        difference: `更侧重${secondary.tags.join('、')}`
      },
      routine: {
        morning: ['氨基酸洁面', '补水喷雾', '保湿乳液'],
        evening: ['卸妆', '洁面', '精华', '面霜']
      }
    }
  }

  getFallbackResponse(blogger, products, round) {
    const product = products[0]
    const responses = {
      'C001': `OMG！${product.name}真的绝了！买它！`,
      'C002': `从成分看，${product.name}比较安全。`,
      'C003': `底层逻辑是修护，${product.name}适合。`,
      'C004': `你现在的问题需要${product.name}。`,
      'C005': `真的！${product.name}超好用！`,
      'C006': `我试过${product.name}，效果不错。`,
      'C007': `${product.name}整体感觉很干净。`
    }
    return responses[blogger.id] || `推荐${product.name}。`
  }
}

export const debateService = new DebateService()
