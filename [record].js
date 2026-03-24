// Vercel Serverless Function - 飞书多维表格数据获取
// 路由: /api/bitable

// 飞书 API 配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;

// 招链通 Bitable 表 Token 配置
const BITABLE_TOKENS = {
    customers: 'JxB8boQ9la945QsUh7ecpDyWnPe',    // 客户线索池
    registrations: 'Bl3zbLraMaSD6Ts1rTwcE1uLntg', // 工商注册进度
    properties: 'NvqibXUrfaN7bTsC9YFcVTGAnab',   // 房源台账
    accounting: 'BBwxbKlrUafsuIsqIvLcKiqMngc',   // 代理记账台账
    calendar: 'BsDJbI91gaoGIpsSs5tc6aHxnae',     // 招商日历
    policies: 'JqcnbUiv6aGVUEsrsmFc3k53nVc',     // 政策库
    experts: 'J3bTbUSfrate6GsTqTNcpGRznXO',       // 专家库
    suppliers: 'SHp8bLvqFaOEcSsP82ecf6Qvnue',     // 供应商库
    contracts: 'Fg6dbrv85axDVvsz713c80PRnoh',    // 合同台账
    revenue: 'NhA7bqMnBaVuN0sW3SlcTVnJnug'       // 营收台账
};

// 获取 tenant_access_token
async function getAccessToken() {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            app_id: FEISHU_APP_ID,
            app_secret: FEISHU_APP_SECRET
        })
    });
    
    const data = await response.json();
    
    if (data.code !== 0) {
        throw new Error(`获取 Access Token 失败: ${data.msg}`);
    }
    
    return data.tenant_access_token;
}

// 获取 Bitable 记录数
async function getRecordCount(token, appToken, tableId) {
    try {
        const response = await fetch(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=1`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        const data = await response.json();
        
        if (data.code === 0) {
            return data.data.total;
        }
        return 0;
    } catch (error) {
        console.error(`获取表 ${tableId} 失败:`, error);
        return 0;
    }
}

// 获取统计数据
async function getStats(token) {
    const stats = {
        customers: 0,
        properties: 0,
        contracts: 0,
        events: 0,
        policies: 0
    };
    
    // 并行获取各表数据
    const promises = [
        getRecordCount(token, BITABLE_TOKENS.customers, 'tblCustomers').then(v => stats.customers = v),
        getRecordCount(token, BITABLE_TOKENS.properties, 'tblProperties').then(v => stats.properties = v),
        getRecordCount(token, BITABLE_TOKENS.contracts, 'tblContracts').then(v => stats.contracts = v),
        getRecordCount(token, BITABLE_TOKENS.calendar, 'tblCalendar').then(v => stats.events = v),
        getRecordCount(token, BITABLE_TOKENS.policies, 'tblPolicies').then(v => stats.policies = v)
    ];
    
    await Promise.all(promises);
    
    return stats;
}

// 主处理函数
export default async function handler(req, res) {
    // 设置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // 检查环境变量
        if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
            return res.status(500).json({
                error: '飞书 API 凭证未配置',
                message: '请在 Vercel 环境变量中配置 FEISHU_APP_ID 和 FEISHU_APP_SECRET'
            });
        }
        
        // 获取 access token
        const token = await getAccessToken();
        
        // 获取统计数据
        const stats = await getStats(token);
        
        return res.status(200).json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
