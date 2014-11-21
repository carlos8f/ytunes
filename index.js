var program = require('commander')
  , ytdl = require('ytdl-core')
  , ffmpeg = require('ffmpeg-bin').ffmpeg
  , fs = require('fs')
  , ProgressBar = require('progress')
  , spawn = require('child_process').spawn

program
  .usage('[options] <url> [dest]')
  .description('rip a YouTube video/playlist to mp3 file(s)')
  .version(require('./package.json').version)
  .parse(process.argv)

if (!program.args[0]) {
  program.outputHelp();
  process.exit();
}

require('ytdl-core/lib/util').sortFormats = function(a, b) {
  var aAudio = a.type.indexOf('audio') === 0;
  var bAudio = b.type.indexOf('audio') === 0;
  if (aAudio && bAudio) return 0;
  if (aAudio && !bAudio) return -1;
  if (!aAudio && bAudio) return 1;
  var bitrates = [], audioBitrates = [];
  [a.bitrate, b.bitrate].forEach(function (br, idx) {
    if (br) {
      if (br.indexOf('-')) bitrates[idx] = parseFloat(br.split('-')[0], 10) * 1000;
      else if (Number(br) > 100) bitrates[idx] = parseFloat(br, 10);
      else bitrates[idx] = parseFloat(br, 10) * 1000;
    }
  });
  [a.audioBitrate, b.audioBitrate].forEach(function (br, idx) {
    if (br) {
      audioBitrates[idx] = parseFloat(br, 10);
    }
  });
  if (!audioBitrates[0] && !audioBitrates[1]) return 0;
  if (!audioBitrates[0] && audioBitrates[1]) return 1;
  if (audioBitrates[0] && !audioBitrates[1]) return -1;

  if (!bitrates[0] && !bitrates[1]) return 0;
  if (!bitrates[0] && bitrates[1]) return -1;
  if (bitrates[0] && !bitrates[1]) return 1;
  var aScore = audioBitrates[0] / bitrates[0];
  var bScore = audioBitrates[1] / bitrates[1];
  if (aScore > bScore) return -1;
  if (aScore < bScore) return 1;
  return 0;
};

var info, format;
var dl_bar;
var dl = ytdl(program.args[0])
  .on('info', function (i, f) {
    info = i;
    format = f;
    console.log(format);
    var video_path = info.title + ' - ' + info.video_id + '.' + format.container;
    var audio_path = info.title + ' - ' + info.video_id + '.mp3';
    console.log('downloading to ' + video_path);
    dl_bar = new ProgressBar(':bar', {
      complete: '=',
      incomplete: ' ',
      width: 70,
      total: parseFloat(format.size, 10)
    });

    var last_second = 0;
    dl.pipe(fs.createWriteStream(video_path))
      .on('finish', function () {
        console.log('converting to ' + audio_path);

        var ff = spawn(ffmpeg, ['-y', '-i', video_path, '-f', 'mp3', '-vn', audio_path])
          .on('exit', function (code) {
            console.log('removing video...');
            fs.unlink(video_path, function (err) {
              if (err) throw err;
              console.log('complete!');
            });
          })
      });
  })
  .on('data', function (data) {
    dl_bar.tick(data.length);
  })
