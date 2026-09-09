# Binance Historical Data Collector

A CLI utility to easily download and aggregate large amounts of historical trading data from Binance. Each file is verified with the checksum. Files are unzipped and merged automatically.

## Why

Binance offers two methods to access the historical data: through the [API](https://developers.binance.com/en/docs/catalog) in `JSON` format or from the [Market Data](https://data.binance.vision/) page in `CSV` format. The API can't be used to *quickly* get any considerable amount of data, especially for data types such as `trades` and `aggTrades`. This library makes it easy to quickly download data in `CSV` format for a custom date range, multiple symbols and intervals with a single command.

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

This command downloads `monthly` data for two `symbols` and all `intervals` from `2021-01` to `2023-12` (3 years), which will result in 1152 downloaded ZIP archives.

#### Possible values

##### `--product (-p)`

- spot
- usd-m
- coin-m
- option

##### `--data-type (-t)` (spot)

- klines
- aggTrades
- trades

##### `--data-type (-t)` (usd-m/coin-m monthly)

- aggTrades
- bookTicker
- fundingRate
- indexPriceKlines
- klines
- markPriceKlines
- premiumIndexKlines
- trades

##### `--data-type (-t)` (coin-m daily)

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

##### `--data-type (-t)` (usd-m daily)

- aggTrades
- bookDepth
- bookTicker
- indexPriceKlines
- klines
- markPriceKlines
- metrics
- premiumIndexKlines
- trades

##### `--data-type (-t)` (option)

- BVOLIndex
- EOHSummary

##### `--intervals (-i)`

1s 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1mo.

### Header

All the files after merging will have a header. Pass `--no-header (-H)` to only have the data.

### Merge

By default the archives will be unzipped, grouped by the symbol and interval and merged in the corresponding CSV files. 

Suppose you need to get data for two symbols and two intervals:

```shell
binance-fetch -d 2023-01 2025-12 -p usd-m -t klines -s btcusdt ethusdt -i 4h 1d
```

This will result in 4 CSV files:

- BTCUSDT-usdm-klines-4h-2023-01--2025-12.csv
- BTCUSDT-usdm-klines-1d-2023-01--2025-12.csv
- ETHUSDT-usdm-klines-4h-2023-01--2025-12.csv
- ETHUSDT-usdm-klines-1d-2023-01--2025-12.csv

Pass `--no-merge (-M)` to get the original ZIP files instead.

### Output directory

By default the data is saved in the current directory. Pass `--output (-o)` followed by a relative or absolute path to change that.

### Concurrency

By default 5 files are downloaded at a time. Use `--parallel (-P)` to change the number (pass `-P 1` to download each file sequentially).

## Debug

If you get `(no data)` for a file, it's likely that Binance does not have the data for the chosen market/data-type/date/symbol/interval. You can verify what data is available [here](https://data.binance.vision/?prefix=data/). Product `usd-m` corresponds to `futures/um`, `coin-m` corresponds to `futures/cm`.

## License

MIT
