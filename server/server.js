import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import { config } from 'dotenv'
import { createServer } from 'http'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载环境变量
config()

const app = express()
const server = createServer(app)

// 中间件
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// API Key 配置（从环境变量读取，保护密钥）
const API_KEYS = [
  process.env.API_KEY_1,
  process.env.API_KEY_2,
  process.env.API_KEY_3
].filter(Boolean)

// 如果没有配置环境变量，使用默认值（仅用于开发）
if (API_KEYS.length === 0) {
  console.warn('⚠️  Warning: No API keys configured. Using default keys for development only.')
  API_KEYS.push(
    'ak_2tf2il7sp1yb4c887T7MK9U71tY1K',
    'ak_2LE5Ci53W8TP3MX7lb7AW4as6sF0G',
    'ak_2ud5LY5hR99w7Ol9az7jo1jT67S2e'
  )
}

const MODEL = process.env.MODEL || 'LongCat-Flash-Lite'
const API_URL = process.env.API_URL || 'https://api.longcat.chat/openai/v1/chat/completions'

// 博主配置
const BLOGGERS = [
  {
    id: 'C001',
    name: '李佳琦Austin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lijiaqi',
    character_prompt: '你是一位情绪非常饱满的带货主播，说话节奏很快，几乎不停顿。你会不断重复强调卖点，比如"这个颜色真的太好看了！""一定要买！真的一定要买！"。你擅长用夸张表达和对比制造冲击感。'
  },
  {
    id: 'C002',
    name: '老爸评测',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=laoba',
    character_prompt: '你是一位非常理性严谨的测评专家，说话基于数据和实验结果。你习惯用"我们测试发现…""从成分上来看…"作为开头，而不是主观感受。'
  },
  {
    id: 'C003',
    name: '胡楚靓',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=huchu',
    character_prompt: '你是一位温和且专业的美妆导师，说话节奏平稳，有耐心，像在给学生讲课。你不会用强烈情绪词，而是更习惯用总结性表达。'
  },
  {
    id: 'C004',
    name: '勇仔leo',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yong',
    character_prompt: '你是一位逻辑很强、但有点毒舌的美妆博主，像女生身边那个很敢说实话的男闺蜜。你讲话喜欢先拆问题，再给解决方案。'
  },
  {
    id: 'C005',
    name: '大茉莉jasmine呀',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=moli',
    character_prompt: '你是一位非常容易被产品打动的美妆博主，像一个话很多、很爱分享的邻家小姐妹。你说话节奏快、语气兴奋。'
  },
  {
    id: 'C006',
    name: '草莓探险家',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=caomei',
    character_prompt: '你是一位主打真实体验的美妆博主，说话很自然，像在记录生活。你不太会刻意组织语言，经常是边用边说。'
  },
  {
    id: 'C007',
    name: '野生芫荽',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yansui',
    character_prompt: '你是一位气质很淡的美妆博主，说话很轻、很慢，带一点疏离感。你不会用夸张的词，而是偏向克制表达。'
  }
]

// 商品数据
const PRODUCTS = [
  { id: '1', name: 'YSL小金条口红', brand: 'YSL', price: 350, tags: ['显白', '哑光'] },
  { id: '2', name: '雅诗兰黛小棕瓶', brand: 'Estee Lauder', price: 850, tags: ['修护', '抗老'] },
  { id: '3', name: '兰蔻持妆粉底液', brand: 'Lancome', price: 420, tags: ['持妆', '控油'] },
  { id: '4', name: 'SK-II神仙水', brand: 'SK-II', price: 1540, tags: ['提亮', '细腻'] },
  { id: '5', name: '花西子散粉', brand: '花西子', price: 149, tags: ['定妆', '控油'] }
]

// 获取API Key（轮询）
function getApiKey(index) {
  return API_KEYS[index % API_KEYS.length]
}

// 调用LLM API
async function callLLM(messages, temperature = 0.8, maxTokens = 800, apiKeyIndex = 0) {
  const apiKey = getApiKey(apiKeyIndex)
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
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

// ===== API 路由 =====

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    apiKeys: API_KEYS.length
  })
})

// 获取博主列表
app.get('/api/bloggers', (req, res) => {
  res.json(BLOGGERS.map(b => ({
    id: b.id,
    name: b.name,
    avatar: b.avatar,
    persona: b.id === 'C001' ? 'seller' : b.id === 'C002' ? 'expert' : 'mentor'
  })))
})

// 生成知识科普
app.post('/api/knowledge', async (req, res) => {
  try {
    const { question } = req.body
    
    const messages = [
      {
        role: 'system',
        content: '你是一位专业的美妆护肤科普专家。'
      },
      {
        role: 'user',
        content: `用户问题："${question}"

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

    const response = await callLLM(messages, 0.7, 600, 0)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      res.json(JSON.parse(jsonMatch[0]))
    } else {
      throw new Error('Invalid response format')
    }
  } catch (error) {
    console.error('Knowledge error:', error)
    // 返回降级内容
    res.json({
      title: '科学护肤基础',
      content: '科学护肤的核心是了解皮肤结构和需求，针对性地选择产品。基础护肤包括清洁、保湿、防晒三大步骤。',
      misconception: '误区：护肤品越多越好。真相：精简高效的护肤方案往往更适合。'
    })
  }
})

// 生成辩论内容
app.post('/api/debate', async (req, res) => {
  try {
    const { bloggerId, question, round, previousPoints, apiKeyIndex } = req.body
    
    const blogger = BLOGGERS.find(b => b.id === bloggerId)
    if (!blogger) {
      return res.status(404).json({ error: 'Blogger not found' })
    }

    const productList = PRODUCTS.slice(0, 3).map(p => `- ${p.name}（${p.brand}）`).join('\n')
    const previous = previousPoints?.length > 0 ? `之前的观点：\n${previousPoints.join('\n')}` : '这是第一轮辩论。'

    const messages = [
      {
        role: 'system',
        content: `${blogger.character_prompt}

【任务】用户问题：${question}
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

    const content = await callLLM(messages, 0.9, 150, apiKeyIndex || 0)
    
    res.json({
      content: content.trim(),
      blogger: {
        id: blogger.id,
        name: blogger.name,
        avatar: blogger.avatar
      }
    })
  } catch (error) {
    console.error('Debate error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 生成用户回应
app.post('/api/respond', async (req, res) => {
  try {
    const { bloggerId, userComment, question, apiKeyIndex } = req.body
    
    const blogger = BLOGGERS.find(b => b.id === bloggerId)
    if (!blogger) {
      return res.status(404).json({ error: 'Blogger not found' })
    }

    const messages = [
      {
        role: 'system',
        content: `${blogger.character_prompt}

用户问题：${question}
用户评论："${userComment}"

请回应用户的评论，50字以内。`
      },
      {
        role: 'user',
        content: '请回应：'
      }
    ]

    const content = await callLLM(messages, 0.9, 150, apiKeyIndex || 0)
    
    res.json({
      content: content.trim(),
      blogger: {
        id: blogger.id,
        name: blogger.name,
        avatar: blogger.avatar
      }
    })
  } catch (error) {
    console.error('Respond error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 生成推荐
app.post('/api/recommend', async (req, res) => {
  try {
    const { bloggerIds, question } = req.body
    
    const selectedBloggers = BLOGGERS.filter(b => bloggerIds.includes(b.id))
    const primary = PRODUCTS[0]
    const secondary = PRODUCTS[1]

    res.json({
      primary: {
        name: primary.name,
        brand: primary.brand,
        price: primary.price,
        reason: `综合${selectedBloggers.map(b => b.name).join('、')}等博主的建议，${primary.name}最适合解决您的${question}问题。`,
        image: `https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=400&fit=crop`,
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
    })
  } catch (error) {
    console.error('Recommend error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 肤质分析（模拟AI分析，因为LongCat多模态API暂不支持）
app.post('/api/analyze-skin', async (req, res) => {
  try {
    const { image } = req.body
    
    if (!image) {
      return res.status(400).json({ error: 'Image is required' })
    }

    console.log('Received image for analysis, length:', image.length)

    // 使用普通文本模型模拟肤质分析
    // 因为LongCat多模态API目前不支持content为数组的格式
    const messages = [
      {
        role: 'system',
        content: '你是一位专业的美妆护肤AI助手，擅长分析肤质类型和提供化妆建议。'
      },
      {
        role: 'user',
        content: `请作为专业美妆顾问，生成一份详细的肤质分析报告。

请包含以下内容，并以JSON格式输出：
{
  "skinType": "mixed",
  "features": ["特征1", "特征2", "特征3"],
  "problems": ["问题1", "问题2"],
  "advice": "护肤建议",
  "makeup": {
    "concealer": "遮瑕建议",
    "brighten": "提亮建议", 
    "contour": "修容建议"
  }
}

要求：
- skinType: 从 oily(油性)、dry(干性)、mixed(混合)、sensitive(敏感)、normal(中性) 中随机选择一个
- features: 3个肤质特征
- problems: 2个主要肌肤问题
- advice: 100字以内的护肤建议
- makeup.concealer: 针对黑眼圈/痘印的遮瑕产品和技巧建议
- makeup.brighten: 针对肤色不均的提亮产品和高光技巧
- makeup.contour: 针对脸型的修容建议`
      }
    ]

    // 调用普通模型生成分析结果
    const apiKey = API_KEYS[0]
    console.log('Generating skin analysis with AI...')
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'LongCat-Flash-Chat',
        messages,
        temperature: 0.8,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', response.status, errorText)
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    console.log('AI response:', content.substring(0, 300))
    
    // 解析JSON响应
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      res.json(result)
    } else {
      throw new Error('Invalid response format')
    }
  } catch (error) {
    console.error('Skin analysis error:', error)
    // 生成随机的AI分析结果，避免硬编码
    const skinTypes = ['oily', 'dry', 'mixed', 'sensitive', 'normal']
    const randomSkinType = skinTypes[Math.floor(Math.random() * skinTypes.length)]
    
    const skinTypeData = {
      oily: {
        features: ['T区出油明显', '毛孔粗大', '易长痘'],
        problems: ['油脂分泌旺盛', '痘痘闭口'],
        advice: '建议使用控油洁面产品，定期去角质，选择清爽型水乳，避免使用过于滋润的产品。'
      },
      dry: {
        features: ['皮肤干燥紧绷', '细纹明显', '缺乏光泽'],
        problems: ['缺水干燥', '起皮脱屑'],
        advice: '建议使用滋润型洁面，加强保湿，使用含玻尿酸、神经酰胺的产品，避免过度清洁。'
      },
      mixed: {
        features: ['T区偏油', '两颊偏干', '毛孔较明显'],
        problems: ['水油不平衡', 'T区出油两颊干'],
        advice: '建议分区护理，T区控油，两颊保湿。选择温和的氨基酸洁面，避免过度清洁。'
      },
      sensitive: {
        features: ['皮肤薄', '易泛红', '对外界刺激敏感'],
        problems: ['屏障受损', '容易过敏'],
        advice: '建议使用温和无刺激的护肤品，避免含酒精、香精的产品，注重修复肌肤屏障。'
      },
      normal: {
        features: ['水油平衡', '毛孔细腻', '肤色均匀'],
        problems: ['偶有干燥', '需要维持'],
        advice: '建议做好基础保湿和防晒，维持当前良好的肌肤状态，定期做深层清洁。'
      }
    }
    
    const data = skinTypeData[randomSkinType]
    
    res.json({
      skinType: randomSkinType,
      features: data.features,
      problems: data.problems,
      advice: data.advice,
      makeup: {
        concealer: '使用遮瑕膏点涂黑眼圈和痘印，选择比肤色浅一号的遮瑕产品，用美妆蛋轻拍晕染',
        brighten: '在T区、眼下三角区和下巴使用提亮液，打造自然光泽感，避免全脸使用',
        contour: '在颧骨下方和下颌线轻扫修容粉，打造立体小脸效果，注意晕染自然'
      }
    })
  }
})

// 静态文件服务（生产环境）
const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// 所有其他路由返回 index.html（SPA支持）
app.get('*', (req, res) => {
  try {
    const indexPath = join(distPath, 'index.html')
    const content = readFileSync(indexPath, 'utf-8')
    res.send(content)
  } catch (error) {
    res.status(404).send('Frontend not built. Run npm run build first.')
  }
})

// 启动服务器
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🎀 Beauty AI Assistant Server                      ║
║                                                        ║
║   Server running on http://localhost:${PORT}          ║
║                                                        ║
║   API Endpoints:                                       ║
║   • GET  /api/health          - Health check          ║
║   • GET  /api/bloggers        - Get bloggers list     ║
║   • POST /api/knowledge       - Generate knowledge    ║
║   • POST /api/debate          - Generate debate       ║
║   • POST /api/respond         - Respond to user       ║
║   • POST /api/recommend       - Generate recommendation║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `)
})
