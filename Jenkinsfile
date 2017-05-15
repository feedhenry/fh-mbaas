//https://github.com/feedhenry/fh-pipeline-library

fhBuildNode {
    stage('Install Dependencies') {
        npmInstall {}
    }

    stage('Build') {
        gruntBuild {
            name = 'fh-mbaas'
        }
    }
}
