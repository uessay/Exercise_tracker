const express = require('express');
const app = express();
require('dotenv').config({ path: 'sample.env'})
const cors = require('cors')
const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  }
})
url ='Mongo db url'
mongoose.connect(url,  { useNewUrlParser: true, useUnifiedTopology: true })
// 
const User = mongoose.model('User', UserSchema);
const ExerciseSchema = new mongoose.Schema({
  user: {
    type: mongoose.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type:Number,
    required:true
  },
  date: {
    type: Date,
    default: Date.now()
  }
})

const Exercise = mongoose.model('Exercise', ExerciseSchema);

const rgx = {
  duration: /^\d+$/,
  date: /^\d{4}-\d{1,2}-\d{1,2}$/
}

app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  let {description, duration, date } = req.body;
  const {_id} = req.params;
  try {
    if(!description){
      return res.send("Path 'description' is required.")
    } else if(!duration){
      return res.send("Path 'duration' is required.")
    } else if(!rgx.duration.test(duration)){
      return res.send("Path 'duration' is numbers only.")
    }
    let user = await User.findOne({ _id });
    if(!user){
      return res.send('User not found');
    }
    let obj = {
      user: _id,
      duration: duration,
      description,
      date
    }

    const exercise = await new Exercise(obj);
    await exercise.save();
    console.log(user.username + ' added a new exercise: ' + exercise.description)
    return res.json({
      _id,
      username: user.username,
      date: new Date(exercise.date).toDateString(),
      duration: exercise.duration,
      description: exercise.description
    })
  } catch (e) {
    return res.send(e.errors.date.message || e);
  }
  return res.redirect('/')

})
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  if(!username){
    return res.send("Path 'username' is required.");
  }

  try{
    let user = await User.findOne({ username });
    if(user){
      return res.send('Username already taken.');
    }

    user = await new User({ username });
    await user.save();
    return res.json({ username, _id: user._id })

  } catch (e) {
    return res.send('Something went wrong');
  }
  return res.redirect('/');
})



app.get('/api/users/:_id/logs',async (req, res) => {
    const { to, limit, from } = req.query;
    // console.log(req.query, 'QUERY')
  try {
    User.findById(req.params._id, (async(err, user) => {
      if(!user) return res.json({
        count: 0,
        log:[]
      })
      if(err || !user){
        return res.json({ error: err})
      }

      let log = await Exercise.find({ user: user._id }).select(['date', 'description', 'duration']).limit(+limit);
      log = log.map(({
        description,
        duration,
        date
      }) => {
        return ({
          description,
          duration,
          date: new Date(date).toDateString()
        })
      })
      
      if(rgx.date.test(to)){
        log = log.filter(ex => {
          return Date.parse(ex.date) <= Date.parse(to)
        })
      }

      if(rgx.date.test(req.query.from)){
        log = log.filter(ex => {
          return Date.parse(ex.date) >= Date.parse(req.query.from)
        })
      }

      log = log.slice(0, parseInt(limit) || log.length)
      
      const response = {
            _id: user._id,
            username: user.username,
            count:log.length,
            log,
      }
      console.log(log, log.length);
          // console.log(response)
      return res.json(response)
      
    }))
  } catch(e) {
    console.log('assertion error',e)
  }
})

app.get('/api/users', async(req,res) => {
  const users = await User.find().select('_id username')
  return res.json(users)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
  mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('database connected')
  })
})
