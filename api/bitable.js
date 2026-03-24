// Vercel Serverless Function - 飞书多维表格数据获取
// 路由: /api/bitable

const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;

const BITABLE_TOKENS = {
    customers: 'JxB8boQ9la945QsUh7ecpDyWnPe',
    registrations: 'Bl3zbLraMaSD6Ts1rTwcE1uLntg',
    properties: 'NvqibXUrfaN7bTsC9YFcVTGAnab',
    accounting: 'BBwxbKlrUafsuIsqIvLcKiqMngc',
    calendar: 'BsDJbI91gaoGIpsSs5tc6aHxnae',
    policies: 'JqcnbUiv6aGVUEsrsmFc3k53nVc',
    experts: 'J3bTbUSfrate6GsTqTNcpGRznXO',
    suppliers: 'SHp8bLvqFaOEcSsP82ecf6Qvnue',
    contracts: 'Fg6dbrv85axDVvsz713c80PRnoh',
    revenue: 'NhA7bqMnBaVuN0sW3SlcTVnJnug'
};

// 获取 tenant_access_token
async function getAccessToken() {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: FEISHU_APP_ID,
            app_secret: FEISHU_APP_SECRET
        })
    });
    
    const data = await response.json();
    if (data.code !== 0) {
        throw new Error('获取 Access Token 失败: ' + data.msg);
    }
    return data.tenant_access_token;
}

// 获取 Bitable 的所有表信息
async function getBitableTables(token, appToken) {
    try {
        const response = await fetch(
            'https://open.feishu.cn/open-apis/bitable/v1/apps/' + appToken + '/tables',
            {
                headers: { 'Authorization': 'Bearer ' + token }
            }
        );
        const data = await response.json();
        if (data.code === 0) {
            return data.data.items || [];
        }
        return [];
    } catch (error) {
        console.error('获取表列表失败:', error);
        return [];
    }
}

// 获取记录数
async function getRecordCount(token, appToken, tableId) {
    try {
        const response = await fetch(
            'https://open.feishu.cn/open-apis/bitable/v1/apps/' + appToken + '/tables/' + tableId + '/records?page_size=1',
            {
                headers: { 'Authorization': 'Bearer ' + token }
            }
        );
        const data = await response.json();
        if (data.code === 0) {
            return data.data.total || 0;
        }
        return 0;
    } catch (error) {
        return 0;
    }
}

async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
            return res.status(500).json({
                success: false,
                error: '飞书 API 凭证未配置'
            });
        }
        
        const token = await getAccessToken();
        const result = {};
        
        // 获取客户线索池的表信息
        const customersTables = await getBitableTables(token, BITABLE_TOKENS.customers);
        result.customersTableInfo = {
            appToken: BITABLE_TOKENS.customers,
            tables: customersTables.map(t => ({ name: t.name, tableId: t.table_id })),
            count: customersTables.length > 0 ? await getRecordCount(token, BITABLE_TOKENS.customers, customersTables[0].table_id) : 0
        };
        
        // 获取房源台账
        const propertiesTables = await getBitableTables(token, BITABLE_TOKENS.properties);
        result.propertiesTableInfo = {
            appToken: BITABLE_TOKENS.properties,
            tables: propertiesTables.map(t => ({ name: t.name, tableId: t.table_id })),
            count: propertiesTables.length > 0 ? await getRecordCount(token, BITABLE_TOKENS.properties, propertiesTables[0].table_id) : 0
        };
        
        // 获取合同台账
        const contractsTables = await getBitableTables(token, BITABLE_TOKENS.contracts);
        result.contractsTableInfo = {
            appToken: BITABLE_TOKENS.contracts,
            tables: contractsTables.map(t => ({ name: t.name, tableId: t.table_id })),
            count: contractsTables.length > 0 ? await getRecordCount(token, BITABLE_TOKENS.contracts, contractsTables[0].table_id) : 0
        };
        
        // 获取招商日历
        const calendarTables = await getBitableTables(token, BITABLE_TOKENS.calendar);
        result.calendarTableInfo = {
            appToken: BITABLE_TOKENS.calendar,
            tables: calendarTables.map(t => ({ name: t.name, tableId: t.table_id })),
            count: calendarTables.length > 0 ? await getRecordCount(token, BITABLE_TOKENS.calendar, calendarTables[0].table_id) : 0
        };
        
        // 获取政策库
        const policiesTables = await getBitableTables(token, BITABLE_TOKENS.policies);
        result.policiesTableInfo = {
            appToken: BITABLE_TOKENS.policies,
            tables: policiesTables.map(t => ({ name: t.name, tableId: t.table_id })),
            count: policiesTables.length > 0 ? await getRecordCount(token, BITABLE_TOKENS.policies, policiesTables[0].table_id) : 0
        };
        
        return res.status(200).json({
            success: true,
            data: result,
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

module.exports = handler;
