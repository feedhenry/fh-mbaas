The crash monitor listens for crash messages from apps and based on configuration options decides whether any action should be taken.

Example configuration:

```
"crash_monitor":{
    "enabled":true,  
    "min_num_crashes":1,  // the minimum number of crashes that have to take place before the crash monitor will take any action
    "max_num_crashes":20, // the maximum number of crashes we will tolerate over the specified sample_time_hrs value. If this value is reached the app will be stopped. This is more of a fail safe option.
    "tolerance":1,  // the number of crashes we will tolerate within the base_time_seconds. So here we will tolerate 1 crash per 60 seconds up to a maximum of 20
    "base_time_seconds":60, //
    "sample_time_hrs":1 //A rolling period of time that we sample. So here we would take up to the last hour of crashes. Once the time elapsed passed this value a new test period is started. 
  }
  
``` 
 
 Each time a crash message is received, the average number of crashes that has occurred within the last sample_time_hrs is calculated. The sample time starts from the time of the first crash occurance. Once an app has crashed the minimum number of times, we begin deciding whether to take action or not
   
 E.g. if the sample_time_hrs is 1 and the app started crashing 30 mins ago and has now crashed 31 times we will have an average number of crashes of 1 per minute.
 If our tolerance is 1 and base_time_seconds is 60 then our tolerance will have been met and the app is stopped.
 
 The reason for using an average is to try to cater for the fact that apps do not always crash with regular intervals. It may crash 3 times in 3 seconds and then not crash for 10 minutes.
 
 A sample time is used to gain insight into the recent behaviour of the app rather than the behaviour of the app over a very long periods of time.
 
 The maximum_num_crashes is a fail safe for if an app manages to avoid being stopped.