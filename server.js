// server.js commit4完整代码
const express = require('express');
const db = require('./event_db.js');
const cors = require('cors');
const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 1.GET home events
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

//2.GET categories
app.get('/api/categories',(req,res)=>{
    const sql = "SELECT * FROM event_categories";
    db.query(sql,(err,result)=>{
        if(err) return res.status(500).json({msg:"category query fail",err});
        res.json(result);
    });
});

//3.GET search events
app.get('/api/search-events',(req,res)=>{
    let {date,location,cat_id} = req.query;
    let sql = `SELECT e.*, c.cat_name FROM events e LEFT JOIN event_categories c ON e.cat_id = c.cat_id WHERE e.is_active = 1`;
    let params = [];
    if(date){sql += " AND e.event_date = ?";params.push(date);}
    if(location){sql += " AND e.event_location LIKE ?";params.push(`%${location}%`);}
    if(cat_id){sql += " AND e.cat_id = ?";params.push(cat_id);}
    db.query(sql,params,(err,result)=>{
        if(err) return res.status(500).json({msg:"search fail",err});
        res.json(result);
    });
});

//4.GET single event detail
app.get('/api/event-detail/:id',(req,res)=>{
    const id = req.params.id;
    const sql = `SELECT e.*, c.cat_name FROM events e 
                LEFT JOIN event_categories c ON e.cat_id = c.cat_id 
                WHERE e.event_id = ?`;
    db.query(sql,[id],(err,result)=>{
        if(err) return res.status(500).json({msg:"detail query fail",err});
        res.json(result[0]);
    });
});

// ========== 新增 POST 接口：添加慈善活动（拓展接口）==========
app.post('/api/events', (req, res) => {
    const {event_name,event_description,event_date,event_location,cat_id,ticket_price,charity_goal,charity_progress} = req.body;
    const sql = `INSERT INTO events(event_name,event_description,event_date,event_location,cat_id,ticket_price,charity_goal,charity_progress,is_active) VALUES (?,?,?,?,?,?,?,?,1)`;
    db.query(sql,[event_name,event_description,event_date,event_location,cat_id,ticket_price,charity_goal,charity_progress],(err,result)=>{
        if(err) return res.status(500).json({msg:"Create event failed",err});
        res.json({msg:"Event created successfully", newId: result.insertId});
    })
})

// ========== 新增 DELETE 接口：删除活动（拓展接口）==========
app.delete('/api/events/:id', (req,res)=>{
    const id = req.params.id;
    const sql = "DELETE FROM events WHERE event_id = ?";
    db.query(sql,[id],(err,result)=>{
        if(err) return res.status(500).json({msg:"Delete failed",err});
        if(result.affectedRows === 0) return res.status(404).json({msg:"Event not found"});
        res.json({msg:"Event deleted successfully"});
    })
})

app.listen(port,()=>{
    console.log(`Server run at http://localhost:${port}`);
});
