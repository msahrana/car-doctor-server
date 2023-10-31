const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.crgl3kb.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const logger = async(req, res, next) => {
  console.log('called', req.host, req.originalUrl)

  next()
}

const verifyToken = async(req, res, next) =>{
  const token = req.cookies?.token 
  console.log('value of token of middleware', token)
  if (!token) {
    return res.status(401).send({massage: 'not authorized'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if (err) {
      return res.status(401).send({massage: 'unauthorized'})
    }
    res.users = decoded
    next()
  })
  
}

async function run() {
  try {
    // await client.connect();

    const servicesCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('booking');

    /* for api */
    app.post('/jwt', logger, async(req, res) =>{
      const users = req.body
      console.log(users)
      const token = jwt.sign(users, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: 'production',  
        sameSite: 'strict'
      })
      .send({success: true})
    })

    /* for service */
    app.get('/services', logger, async(req, res) => {
      const cursor = servicesCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/services/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await servicesCollection.findOne(query)
      res.send(result)
    })

    /* for booking */
    app.get('/booking',logger, verifyToken, async(req, res)=>{
      console.log('req.query.email')
      console.log('users of valid token', req.users)
      if (req.query?.email !== req.users?.email) {
        return res.status(403).send({massage: 'forbidden'})
      }
      // console.log('tok tok token', req.cookies.token)
      let query = {}
      if (req.query?.email) {
        query = {email: req.query.email}
      }
      const result = await bookingCollection.find(query).toArray()
      console.log(result)
      res.send(result)
    })

    app.post('/booking', async(req, res) =>{
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    })

    app.patch('/booking/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)};
      const updateBooking = req.body;
      console.log(updateBooking);
      const updateDoc = {
        $set: {
          status: updateBooking.status
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.delete('/booking/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await bookingCollection.deleteOne(query)
      res.send(result)
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res)=>{
    res.send('Car server is running')
})

app.listen(port, ()=>{
    console.log(`Car doctor server is running on post: ${port}`)
})