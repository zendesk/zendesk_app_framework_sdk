require 'zendesk/deployment'
require 'airbrake/capistrano'

set :application, "zendesk_app_framework_sdk"
set :repository, "git@github.com:zendesk/zendesk_app_framework_sdk"
set :ruby_version, File.read(".ruby-version").chomp
set :require_tag?, true
set :email_notification, ["deploys@zendesk.com"]

set(:assets_path) { File.join(deploy_to, 'assets') }
set(:sdk_path) { File.join(assets_path, 'sdk') }
set(:latest_version_path) { File.join(sdk_path, 'latest') }
set(:build_version) { (tag && tag.gsub(/^v/, '')) || fetch(:branch, nil) || local_head_revision }

set(:real_revision) { Zendesk::Deployment::Committish.new(revision).sha }

def sh(command)
  logger.trace "executing locally: #{command.inspect}" if logger
  result = `#{command}`
  abort "COMMAND FAILED #{command}\n#{result}" unless $?.success?
  result
end

namespace :zendesk_app_framework_sdk do

  desc "Prepare server(s) for deployment"
  task :setup, :except => { :no_release => true } do
    # create basic directories
    dirs = [deploy_to, assets_path, sdk_path, latest_version_path, log_path] + release_paths

    logger.info "Ensuring that the main directories are there"
    run "sudo install -d -m 0775 -o #{user} -g #{fetch(:group, user)} #{dirs.join(' ')}"
  end

  desc "Deploy zendesk_app_framework_sdk"
  task :deploy do
    logger.info "Generating assets"
    sh "npm install"
    sh "bin/grunt build"

    logger.info "Uploading assets"

    run "mkdir -p #{sdk_path}/#{build_version}"
    upload "build/zaf_sdk.js",     "#{sdk_path}/#{build_version}/zaf_sdk.js", :via => :scp
    upload "build/zaf_sdk.min.js", "#{sdk_path}/#{build_version}/zaf_sdk.min.js", :via => :scp
    upload "build/zaf_sdk.min.map", "#{sdk_path}/#{build_version}/zaf_sdk.min.map", :via => :scp
  end

  before 'zendesk_app_framework_sdk:update_latest' do
    if require_tag?
      unless tag && committish.valid_tag?
        msg = [
          "You need to specify a valid tag when deploying #{application}",
          "Example:",
          "   bundle exec cap #{application}:update_latest TAG=v2.56.2"
        ]
        abort(msg.join("\n"))
      end
    end
  end

  desc "Update the 'latest' version of zendesk_app_framework_sdk"
  task :update_latest do
    logger.info "Updating latest sdk version"
    begin
      run "test -f #{sdk_path}/#{build_version}/zaf_sdk.js"
      run "test -f #{sdk_path}/#{build_version}/zaf_sdk.min.js"
      run "test -f #{sdk_path}/#{build_version}/zaf_sdk.min.map"
    rescue Capistrano::CommandError
      logger.important "ERROR: One of the target release file does not exist!"
      exit
    end
    run "ln -snf #{sdk_path}/#{build_version}/zaf_sdk.js #{latest_version_path}/zaf_sdk.js"
    run "ln -snf #{sdk_path}/#{build_version}/zaf_sdk.min.js #{latest_version_path}/zaf_sdk.min.js"
    run "ln -snf #{sdk_path}/#{build_version}/zaf_sdk.min.map #{latest_version_path}/zaf_sdk.min.map"
  end

  after 'zendesk_app_framework_sdk:update_latest ' do
    Zendesk::Deployment::Notify::Message.class_eval do
      def subject
        "[ZD SWITCH] #{deployer} updated_latest for #{application} on #{environment}: #{revision_set.current}"
      end
    end
    find_and_execute_task 'deploy:notify'
  end

end
