var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var through = require('through2');
var Rcloader = require('rcloader');
var _ = require('lodash');
var Tslint = require('tslint');
// @todo: may be do a parameter ?
var MAX_REPORT_LINES = 20;

function formatter(failures, errors) {
    var out = (gutil.colors.supportsColor) ?
        gutil.colors.cyan('Tslint failures: ' + failures + '\n') : 'Tslint failures: ' + failures + '\n';

    var lines = errors.split('\n').filter(function(v) { return v.trim().length !== 0; });

    if (lines.length > MAX_REPORT_LINES) {
        lines = lines.slice(0, MAX_REPORT_LINES);
        lines.push((gutil.colors.supportsColor) ? gutil.colors.magenta('...') : '');
    }

    return out + lines.map(function(line) {
        return line.replace(/^(.*?)(\]\:)(.*)/, function (match, a, s, b) {
            if (!gutil.colors.supportsColor) {
                return match;
            }
            return a + s + gutil.colors.magenta(b);
        })
    }).join('\n');

    var out = gutil.colors.cyan('Tslint failures: ' + failures + '\n') +
        errors.split('\n').filter(function(v) { return v.trim().length !== 0; }).map(function (line) {
            var s = ']: ';
            var t;
            if (!gutil.colors.supportsColor) {
                return line;
            }
            t = line.split(s);
            return t[0] + s + gutil.colors.magenta(t[1]);
        }).join('\n');
}

module.exports = function (rulesOverrides) {
    var summary = '';
    var failures = 0;
    var options = {
        formatter: 'prose',
        configuration: {},
        rulesDirectory: null,
        formattersDirectory: null
    };
    var loader = new Rcloader('tslint.json', options.configuration);

    if (!rulesOverrides) {
        rulesOverrides = {};
    }

    return through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            return cb(null, file);
        }
        if (file.isStream()) {
            return cb(new PluginError('gulp-tslint-1.6', 'Streaming not supported'));
        }

        loader.for(file.path, function (err, tslintOptions) {
            var linter;
            var result;
            if (err) {
                return cb(err, undefined);
            }
            // extends rules
            options.configuration = _.merge({}, tslintOptions, rulesOverrides);

            linter = new Tslint(file.relative, file.contents.toString('utf8'), options);
            result = linter.lint();

            if (result.failureCount > 0) {
                summary += result.output;
                failures += result.failureCount;
            }
            cb(null, file);
        });

    }, function (cb) {
        var err = null;
        if (failures > 0) {
            err = new PluginError('gulp-tslint-1.6', formatter(failures, summary));
        }
        cb(err);
    });
};
