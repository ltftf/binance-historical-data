# Binance Historical Data Collector

A CLI utility to easily download large amounts of historical trading data from [Binance](https://www.binance.com/en). Each file is verified with the checksum.

## Why

Binance offers two methods to access the historical data: through [their API](https://binance-docs.github.io/apidocs) in `JSON` format or [this webpage](https://www.binance.com/en/landing/data) in `CSV` format. It's impossible to *quickly* get historical data for data types like `trades` and `aggTrades` with the first method, and it would still require some manual labor to fetch a lot of files with the second method. 

This library allows to collect data in `CSV` format for any date range, any number of symbols and intervals (if present) with a single command.

## Installation

Install globally:

```shell
npm i -g binance-historical-data
```

Run: 

```shell
binance-fetch --help
```

Or install locally:

```shell
npm i binance-historical-data
```

And run:

```shell
npx binance-fetch --help
```

## Usage

### Trading data params

Download `daily` `klines` data for `spot` market:

```shell
binance-fetch -d 2020-01-01 -p spot -t klines -s btcusdt -i 1h
```

`YYYY-MM-DD` date format is used for `daily` data. Use `YYYY-MM` for `monthly` data.

To get data for a range of `dates`, provide two `date` strings separated by a space. Multiple `symbols` and `intervals` can also be provided separated by a space.

```shell
binance-fetch -d 2021-01 2023-12 -p spot -t klines -s btcusdt ethusdt -i 1s 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1mo
```

This command downloads `monthly` data for two `symbols` and all `intervals` from `2021-01` to `2023-12` (3 years), which will result in 1152 downloaded files.

#### Possible values

##### product

- spot
- usd-m
- coin-m
- option

##### data-type (spot)

- klines
- aggTrades
- trades

##### data-type (usd-m/coin-m monthly)

- aggTrades
- bookTicker
- fundingRate
- indexPriceKlines
- klines
- markPriceKlines
- premiumIndexKlines
- trades

##### data-type (usd-m/coin-m daily)

- aggTrades
- bookDepth
- bookTicker
- indexPriceKlines
- klines
- liquidationSnapshot
- markPriceKlines
- metrics
- premiumIndexKlines
- trades

##### data-type (option)

- BVOLIndex
- EOHSummary

##### interval

For all the intervals see example above.

### Output directory

By default the data is saved in the current directory. Pass `-o` or `--output` followed by a relative or absolute path to change that.

Data is loaded with a stream. Until the file is fully downloaded and verified, it will look like this: `<symbol>...UNVERIFIED.zip`.

### Concurrency

By default 5 files are downloaded at a time. Use `-P` to change the number (pass `-P 1` to download each file sequentially).

## Debug

If you get `(no data)` for a file, it's likely that Binance does not have the data for the chosen market/data-type/date/symbol/interval. You can verify what data is available [here](https://data.binance.vision/?prefix=data/). Product `usd-m` corresponds to `futures/um`, `coin-m` corresponds to `futures/cm`.

## License

MIT
