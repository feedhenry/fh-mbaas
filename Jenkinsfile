#!groovy

// https://github.com/feedhenry/fh-pipeline-library
@Library('fh-pipeline-library') _

stage('Trust') {
    enforceTrustedApproval()
}

fhBuildNode {
    stage('Install Dependencies') {
        npmInstall {}
        withPrivateNPMRegistry {
            sh 'npm install fh-dfc@0.24.4-75'
        }
    }

    stage('Lint') {
        print 'Lint task is broken see https://issues.jboss.org/browse/FH-3611'
        //sh 'grunt eslint'
    }

    withOpenshiftServices(['mongodb']) {
        stage('Unit Tests') {
            sh 'grunt fh-unit'
        }

        stage('Acceptance Tests') {
            sh 'grunt fh-accept'
        }
    }

    stage('Build') {
        gruntBuild {
            name = 'fh-mbaas'
        }
    }

    stage('Build Image') {
        dockerBuildNodeComponent("fh-mbaas")
    }
}
