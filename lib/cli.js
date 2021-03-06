const tasks = require('./tasks');
const helper = tasks.helper;

var globalOptions = exports.globalOptions = [];

// Base usage
defineOption('--no-color', "Disable ANSI color", function() { helper.noColor = true });
defineOption('--debug', "Enable debug mode", function() { helper.debugMode = true; helper.log('Debug mode enabled', helper.level.DEBUG); });
defineOption('--help', "Show help for global usage", function(args) { showHelpOrCallHelpTask(args) });
defineOption('--version', "Show version", showVersion);
defineOption('--log-level=…', "Disable output for messages below the given log level", setLogLevel);

var run = exports.run = function run(callback) {
  try {
    var args = process.argv.slice(2);
    // Process global options
    handleOptions(args);
    // Pass to tasks manager
    tasks.runCLI(args);
  } catch (err) {
    showHelp(err);
  }
}

var getGlobalOptionsHelp = exports.getGlobalOptionsHelp = function getGlobalOptionsHelp() {
  var helpOptions = [];
  globalOptions.forEach(function(o) { helpOptions.push([o[0], undefined, o[1]]) });
  return helper.getOptionsHelp({"Global options:": helpOptions});
}

var getGlobalHelp = exports.getGlobalHelp = function getGlobalHelp() {
  return helper.formatTitle('Usage:') + '\n  '
    + process.title + ' [OPTIONS] [Task] [ARGUMENTS]\n\n'
    + getGlobalOptionsHelp();
}

function defineOption(option, description, callback) {
  globalOptions.push([option, description, callback]);
}

function handleOptions(args) {
  globalOptions.forEach(function(definition) {
    handleOption(definition[0], definition[2], args);
  });
}

function handleOption(option, callback, args) {
  // Expects value
  if (option.match(/=…$/)) {
    var value = null;
    // Search "option <value>"
    var i = args.indexOf(option.substring(0, option.length-2));
    if (i != -1) {
      // Look next value: if none or starts with "-", this is a fail
      if (typeof args[i+1] == 'undefined' || args[i+1].match(/^-/)) {
        throw new Error('"' + option + '" expects an argument');
      }
      args.splice(i, 2);
      callback(args, value);
    }
    // Search "option=<value>"
    else {
      var eqPrefix = option.substring(0, option.length-1);
      for (var i=0; i<args.length; i++) {
        var arg = args[i];
        if (arg.substring(0, option.length-1) == eqPrefix) {
          args.splice(i, 1);
          callback(args, arg.substring(eqPrefix.length-1));
          break;
        }
      }
    }
  }
  // Simple flag
  else {
    var i = args.indexOf(option);
    if (i != -1) {
      args.splice(i, 1);
      callback(args);
    }
  }
}

var showHelp = exports.showHelp = function showHelp(err) {
  var help = getGlobalHelp()
    + '\n'
    + helper.colorize('Available tasks:', 'yellow') + '\n'
    + '  Call "' + process.title + ' list"\n';
  if (err) {
    helper.logError(err);
    console.log(help);
    if (helper.debugMode) {
      console.log('\n' + helper.formatTitle('Stack trace (debug):'));
      throw err;
    }
    process.exit(1);
  } else {
    console.log(help);
    process.exit(0);
  }
}

function showHelpOrCallHelpTask(args) {
  // Look for a task name into arguments
  var taskName = null;
  for (var i=0; i<args.length; i++) {
    if (args[i].match(/^[^-]/)) {
      taskName = args[i];
      break;
    }
  }
  if (taskName) { // Contextual help, transform call "… task --help …" into "… help task …"
    args.unshift('help');
  } else {
    showHelp();
  }
}

function showVersion() {
  try {
    var packageJson = JSON.parse(fs.readFileSync(__dirname + '/../package.json2'));
    helper.log(packageJson.version);
    process.exit(0);
  } catch (err) {
    helper.logError('Unable to retrieve version: cannot find jus-tasks\'s package.json');
    process.exit(1);
  }
}

function setLogLevel(args, name) {
  if (typeof helper.level[name] == 'undefined') {
    throw new Error('Invalid value for log level, valid values: ' + Object.keys(helper.level))
  }
  helper.logLevel = helper.level[name];
}

