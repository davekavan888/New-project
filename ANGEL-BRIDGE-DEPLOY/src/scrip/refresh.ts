import 'dotenv/config'
import { refreshScripMaster } from './mapper.js'
refreshScripMaster()
  .then((n) => {
    console.log(`Scrip master cached: ${n} rows`)
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
