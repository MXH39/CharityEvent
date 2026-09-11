// server.js commit3版本
const express = require('express');
const db = require('./event_db.js');
const cors = require('cors');
const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// GET 首页活动
app.get('/api/home-events',(req,res)=>{
    const today = new Date().toISOString().split('T')[0];
    const sql = `SELECT e.*, c.cat_name FROM events e 
                LEFT JOIN event_categories c ON e.cat_id = c.cat_id 
                WHERE e.is_active = 1 AND e.event_date >= ?
                ORDER BY e.event_date ASC`;
    db.query(sql,[today],(err,result)=>{
        if(err) return res.status(500).json({msg:"query error",err});
        res.json(result);
    });
});

// GET 获取分类
app.get('/api/categories',(req,res)=>{
    const sql = "SELECT * FROM event_categories";
    db.query(sql,(err,result)=>{
        if(err) return res.status(500).json({msg:"category query fail",err});
        res.json(result);
    });
});

app.listen(port,()=>{
    console.log(`Server run at http://localhost:${port}`);
});
