const JasmineConsoleReporter = require('jasmine-console-reporter')

const reporter = new JasmineConsoleReporter({
  activity: true
})
jasmine.getEnv().addReporter(reporter)
