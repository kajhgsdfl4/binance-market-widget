import React, { useState, useEffect } from 'react'
import axios from 'axios'

import './index.css'

const binanceBaseUrl = 'http://www.binance.com/exchange-api/v1/public'
const binanceStreamUrl = 'wss://stream.binance.com'//stream?streams=!miniTicker@arr'

let socket

export const BinanceWidget = () => {
  const [ isLoading, setLoadingStatus ] = useState(true)
  const [ isStreaming, setStreamingStatus ] = useState(false)
  const [ marketData, setMarketData ] = useState({})
  const [ categories, setCategories ] = useState({})
  const [ tickers, setTickers ] = useState({})
  const [ activeCategory, setActiveCategory ] = useState('')
  const [ searchValue, setSearchValue ] = useState('')
  const [sort, setSort] = useState({ field: 'symbol', asc: true})

  useEffect(() => {
    const fetchData = async () => {
      let res = await axios.get(binanceBaseUrl + '/asset-service/product/get-products')
        .catch(err => {
          console.error(err)
          return false
        })

      if (!res) {
        res = await axios.get('/tickers.json')
      }
      const data = res.data.data
      if (data.length === 0) return false

      const _categories = data.reduce((a, c) => {
        a[c.pm] = c.pn
        return a
      }, {})

      const _marketData = data.reduce((a, c) => {
        a[c.s] = c
        return a
      }, {})

      setCategories(_categories)
      setMarketData(_marketData)
      setActiveCategory(Object.values(_categories)[0])

      return true
    }

    fetchData().then(status => {
      setLoadingStatus(!status)
      socket = new WebSocket(binanceStreamUrl + '/stream?streams=!miniTicker@arr')
    })

    return () => {
      if (socket) { socket.close() }
    }
  }, [])

  useEffect(() => {
    if (isLoading === false && socket) {
      socket.onmessage = event => {
        const message = JSON.parse(event.data)

        if (message.stream === '!miniTicker@arr') {
          const update = message.data.reduce((a, item) => {
            if (!marketData[item.s]) {
              return a
            }
            a[item.s] = { ...marketData[item.s], c: Number(item.c), o: Number(item.o), v: Number(item.v) }
            return a
          }, {})

          if (Object.values(update).length > 0) {
            setMarketData({ ...marketData, ...update })
          }

        } else {
          if (message.id === 312) {
            setStreamingStatus(false)
          } else if (message.id === 1) {
            setStreamingStatus(true)
          }
        }
      }

      socket.onopen = event => {
        setStreamingStatus(true)
      }

      socket.onclose = event => {
        console.log(event)
      }

    }
  }, [ isLoading ])

  useEffect(() => {
    const _tickers = Object.values(marketData)
      .filter(item => (item.pm === activeCategory))
      .filter(item => (
        searchValue.length === 0 ||
        (item.b.indexOf(searchValue.toUpperCase()) >= 0 || item.q.indexOf(searchValue.toUpperCase()) >= 0)
      ))
      .map(item => ({
        symbol: `${item.b}/${item.q}`,
        price: `${parseFloat(item.c.toFixed(6))}`,
        volumeBase: `${parseFloat(item.v.toFixed(8))}`
      }))
      .sort((a, b) => {
        if (a[sort.field] > b[sort.field]) {
          return sort.asc === true ? 1 : -1
        }
        if (a[sort.field] < b[sort.field]) {
          return sort.asc === true ? -1 : 1
        }
        return 0
      })

    setTickers(_tickers)
  }, [ marketData, activeCategory, searchValue ])


  const subscription = (status, streamName) => {
    if (socket) {
      const method = status === true ? "SUBSCRIBE" : "UNSUBSCRIBE"
      const id = status === true ? 1 : 312
      const req = {
        "method": method,
        "params":
          [ streamName ],
        "id": id
      }
      socket.send(JSON.stringify(req))
    }
  }

  const sortHandler = field => {
    setSort(prevSort => {
      return {
        field: field,
        asc: (prevSort.field === field ? !prevSort.asc : prevSort.asc)
      }
    })
  }

  return (
    <div className="binance-widget">
      {isLoading === true && 'is loading...'}
      {isLoading === false && (
        <div className="binance-widget__container">
          <div className="binance-widget__tabs">
            <>
              {Object.values(categories).map((category, i) => (
                <button
                  key={i}
                  className={`binance-widget__tab ${category === activeCategory ? 'binance-widget__tab--active' : ''}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
              <button
                className="binance-widget__action"
                onClick={() => subscription(!isStreaming, "!miniTicker@arr")}
              >
                { isStreaming === true ? 'Stop' : 'Start' }
              </button>
            </>
          </div>
          <div className="binance-widget__search">
            <input
              placeholder="search symbol"
              value={searchValue}
              onChange={e => {setSearchValue(e.target.value)}}
            />
          </div>
          <div className="binance-widget__table">
            <div className="binance-widget__table-header">
              <p
                className={`binance-widget__table-header-cell ${sort.field === 'symbol' ? `binance-widget__table-header-cell${!sort.asc ? '--desc' : '--asc'}` : ''}`}
                onClick={() => sortHandler('symbol')}
              >
                Pair
              </p>
              <p
                className={`binance-widget__table-header-cell ${sort.field === 'price' ? `binance-widget__table-header-cell${!sort.asc ? '--desc' : '--asc'}` : ''}`}
                onClick={() => sortHandler('price')}
              >
                Price
              </p>
              <p className={`binance-widget__table-header-cell ${sort.field === 'volumeBase' ? `binance-widget__table-header-cell${!sort.asc ? '--desc' : '--asc'}` : ''}`}
                 onClick={() => sortHandler('volumeBase')}
              >
                Value
              </p>
            </div>
            <div className="binance-widget__table-body">
              <div className="binance-widget__table-rows">
                {tickers.map((row, i) => (
                  <div key={i} className="binance-widget__table-row">
                    <p className="binance-widget__table-cell">
                      {row.symbol}
                    </p>
                    <p className="binance-widget__table-cell">
                      {row.price}
                    </p>
                    <p className="binance-widget__table-cell">
                      {row.volumeBase}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
