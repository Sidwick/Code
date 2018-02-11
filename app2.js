let axios = require('axios')
let argv = require('minimist')(process.argv.slice(2))
let getPort = require('get-port')
let syllables = require('syllable')
let leftPad = require('left-pad')

let chatId = argv.j
let peers = argv.p

let readline = require('readline')

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'Chat Alias ~ '
})

async function main() {
  let port = process.env.PORT || (await getPort())
  console.log('starting blockchain interface on port ' + port + '...\n')
  console.log(
    ` 
    chain state : http://localhost:${port}/state
    transactions: http://localhost:${port}/txs
`
  )
  let opts = {
    port,
    initialState: {
      messages: []
    },
    peers: peers ? [peers] : [],
    logTendermint: false
  }
  if (chatId) {
    opts.genesisKey = chatId
  }
  console.log('1')
  let lotion = require('lotion')(opts)
  console.log('2')
  let link = '                                |                                '
  function logMessage({ sender, message }, index) {
    readline.clearLine(process.stdout, 0)
    readline.cursorTo(process.stdout, 0)
    console.log(
      '|  ' +
        sender +
        leftPad(': ', 12 - sender.length) +
        message +
        leftPad('|', 50 - message.length)
    )
    rl.prompt(true)
  }

  let haikuHandler = (state, tx) => {
    if (
      typeof tx.sender === 'string' &&
      typeof tx.message === 'string' &&
      tx.message.length <= 50
    ) {
        state.messages.push({
          sender: tx.sender,
          message: tx.message
        })
    }
  }
  console.log('3')
  lotion(haikuHandler).then(genesisKey => {
    console.log('4')
    console.log('chat room id is ' + genesisKey + '\n')
    rl.prompt()

    let username

    function usernameError(name) {
      if (name.length > 12) {
        return 'Username is too long'
      }
      if (name.length < 3) {
        return 'Username is too short'
      }
      if (name.indexOf(' ') !== -1) {
        return 'Username may not contain a space'
      }
      return false
    }

    rl.on('line', async line => {
      readline.moveCursor(process.stdout, 0, -1)
      readline.clearScreenDown(process.stdout)
      line = line.trim()
      if (!username) {
        let e = usernameError(line)
        if (e) {
          console.log(e)
        } else {
          username = line
          rl.setPrompt('> ')
        }
      } else {
        let message = line
        let result = await axios({
          url: 'http://localhost:' + port + '/txs',
          method: 'post',
          params: {
            return_state: true
          },
          data: {
            message,
            sender: username
          }
        })
        updateState(result.data.state)
      }

      rl.prompt(true)
    })

    // poll blockchain state
    let lastMessagesLength = 0
    function updateState(state) {
      for (let i = lastMessagesLength; i < state.messages.length; i++) {
        logMessage(state.messages[i], i)
      }
      lastMessagesLength = state.messages.length
    }
    setInterval(async () => {
      let { data } = await axios.get('http://localhost:' + port + '/state')
      updateState(data)
    }, 500)
  })
}

main()