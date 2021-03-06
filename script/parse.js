var path = require('path');
var fs = require('fs');
var glob = require('glob');

var marked = require('marked');
var yaml = require('js-yaml');

var util = require('./util.js');

var MD_SEPERATOR = '---';

var options = {
  src: '**/*.md',
  dest: 'build/data',
  includeFilename: true,
  compileMarkdown: true,
  bodyProperty: 'body',

  exportName: 'content.json',
  singleFile: false,
  writeFiles: false,
  writeStdout: true
};

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: true,
  pedantic: false,
  // sanitize: true,
  smartLists: true,
  // smartypants: false,
  highlight: function(code) {
    return require('highlight.js').highlightAuto(code).value;
  }
});


function parseFile(input) {
  var output = {};
  var hasFrontmatter = input.data.slice(0, 3) === MD_SEPERATOR;
  var rawBody = '';
  if (hasFrontmatter) {
    var splitData = input.data.split(MD_SEPERATOR);
    rawBody = splitData[2];
    try {
      output = yaml.safeLoad(splitData[1]);
    } catch (e) {
      console.log(e); // eslint-disable-line
    }
  } else {
    rawBody = input.data;
  }

  if (options.includeFilename) {
    output.filename = input.filename;
  }

  output[options.bodyProperty] = rawBody;
  if (options.compileMarkdown) {
    var htmlBody = marked(rawBody);
    output[options.bodyProperty] = htmlBody;
  }

  return output;
  // TODO: template stuff.
}

function parseArguments(argv) {
  var args = argv.slice(2);
  var indexes = {};

  indexes.src = args.indexOf('--src');
  if (indexes.src !== -1) {
    options.src = args[indexes.src + 1];
  }

  indexes.dest = args.indexOf('--dest');
  if (indexes.dest !== -1) {
    options.dest = args[indexes.dest + 1];
  }

  var globOptions = {
    ignore: ['node_modules/**'] // ignore node_modules by default
  };

  glob(options.src, globOptions, function(error, files) {
    var fileMap = {};
    files.forEach(function(filename, i) {
      fs.readFile(filename, 'utf8', function(err, data) {
        var json = parseFile({
          data: data,
          filename: filename
        });
        var newFilename = filename.replace(/\.[^/.]+$/, '');
        var newFileWithDest = path.join(options.dest, newFilename + '.json');

        // Keep separate files.
        if (!options.singleFile) {
          var stringified = JSON.stringify(json);
          if (options.writeStdout) {
            process.stdout.write(stringified);
          }

          if (options.writeFiles) {
            util.writeFile(newFileWithDest, stringified);
          }
        // If nested file
        } else {
          fileMap[filename] = json;

          if (i === files.length - 1) {
            var name = path.join(options.dest, options.exportName);
            var stringified = JSON.stringify(fileMap);
            if (options.writeStdout) {
              process.stdout.write(stringified);
            }
            if (options.writeFiles) {
              util.writeFile(name, stringified);
            }
          }
        }
      });
    });
  });
}

parseArguments(process.argv);
