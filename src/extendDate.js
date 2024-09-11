Object.defineProperty(Date.prototype, "daysInMonth", {
  value: function () {
    return new Date(this.getFullYear(), this.getMonth() + 1, 0).getDate();
  },
});

Object.defineProperty(Date.prototype, "getBinanceDate", {
  value: function (daily) {
    return this.toISOString().slice(0, daily ? 10 : 7);
  },
});
