module.exports = function (grunt)
{
  grunt.util.linefeed = '\n';
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    coffee: {
      project: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: ['**/*.coffee'],
          dest: 'build/',
          ext: '.js',
          extDot: 'last'
        }]
      }
    },
    watch: {
      project: {
        files: ['src/**/*'],
        tasks: ['coffee']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['coffee']);
  grunt.registerTask('debug', ['coffee', 'watch']);
}