var _ = require('underscore');
var os = require('os');

var submission = {
  "_id": "53ac7108b8f15d51516d14b0",
  "appClientId": "OgF52REDBM9_ZbDwJjREK-yG",
  "appCloudName": "test-t-ogf521234dv90ndm1p-dev",
  "appEnvironment": "dev",
  "appId": "OgF52MXjmVTjFJ5BRyWLHxy7",
  "deviceFormTimestamp": "2014-06-20T14:43:18.722Z",
  "deviceIPAddress": "213.233.150.90,10.189.254.5",
  "deviceId": "3C5ECCB9-3ABE-4DEC-AD7E-35B11454F366",
  "formId": "53a44886d55d83f96dad6ca8",
  "masterFormTimestamp": "2014-06-20T14:43:18.722Z",
  "timezoneOffset": -60,
  "userId": null,
  "formFields": [{
    "fieldId": "53a44886d55d83f96dad6c96",
    "fieldValues": [30002144]
  }, {
    "fieldId": "53a44886d55d83f96dad6c97",
    "fieldValues": ["OBL126"]
  }, {
    "fieldId": "53a44886d55d83f96dad6c9a",
    "fieldValues": ["LMK-STSE"]
  }, {
    "fieldId": "53a44886d55d83f96dad6c95",
    "fieldValues": ["Test text"]
  }, {
    "fieldId": "53a44886d55d83f96dad6c99",
    "fieldValues": ["LMK"]
  }, {
    "fieldId": "53a44886d55d83f96dad6c94",
    "fieldValues": ["TI"]
  }, {
    "fieldId": "53a44886d55d83f96dad6c98",
    "fieldValues": ["Stone\nsome new line"]
  }, {
    "fieldId": "53a44886d55d83f96dad6c9b",
    "fieldValues": ["Egan_C"]
  }, {
    "fieldId": "53a44886d55d83f96dad6c9c",
    "fieldValues": ["Adjust"]
  }, {
    "fieldId": "53a44886d55d83f96dad6c9d",
    "fieldValues": [""]
  }, {
    "fieldId": "53a44886d55d83f96dad6c9e",
    "fieldValues": ["2014-07-26"]
  }, {
    "fieldId": "53a44886d55d83f96dad6c9f",
    "fieldValues": ["2014-08-26"]
  }, {
    "fieldId": "53a44886d55d83f96dad6ca0",
    "fieldValues": ["High"]
  }, {
    "fieldId": "53a44886d55d83f96dad6ca1",
    "fieldValues": ["Abuttments"]
  }, {
    "fieldId": "53a44886d55d83f96dad6ca2",
    "fieldValues": ["Bent"]
  }, {
    "fieldId": "53a44886d55d83f96dad6ca3",
    "fieldValues": [""]
  }, {
    "fieldId": "53a44886d55d83f96dad6ca4",
    "fieldValues": ["Authorised Work"]
  }, {
    "fieldId": "53a44886d55d83f96dad6ca5",
    "fieldValues": [""]
  }, {
    "fieldId": "53a44886d55d83f96dad6ca6",
    "fieldValues": [{
      "mbaasUrl": "/mbaas/forms/:appId/submission/:submissionId/file/:fileGroupId",
      "url": "/api/v2/forms/submission/file/53ac7112859dcc5151000001?rand=0.04190378077328205",
      "fieldId": "53a44886d55d83f96dad6ca6",
      "fileUpdateTime": 1403810050144,
      "imgHeader": "data:image/png;base64,",
      "fileType": "image/png",
      "fileSize": 560342,
      "contentType": "base64",
      "hashName": "filePlaceHolder10a0bd6f827beb3bc39c5f51d7daa0ea",
      "fileName": "filePlaceHolder10a0bd6f827beb3bc39c5f51d7daa0ea.png",
      "groupId": "53ac7112859dcc5151000001"
    }]
  }],
  "comments": [],
  "status": "complete",
  "submissionStartedTimestamp": "2014-06-26T19:14:16.144Z",
  "updatedTimestamp": "2014-06-26T19:14:29.415Z",
  "submissionCompletedTimestamp": "2014-06-26T19:14:29.409Z",
  "downloadFile": os.tmpdir() + '/download.pdf',
  "pdfExportDir": '/tmp/',
  "fileUrlPath": '/some/path',
  "location": 'example.com.org'
};


module.exports = {
  get: function(){
    return _.clone(submission);
  }
};
