/* eslint-disable */
jQuery(document).ready(function($) {
  var download = $('#download-link').hide();
  var penaltyType = $('#penalty-type')[0].value;
  var reportReference = $('#report-reference')[0].value
  var baseUrl = $('#url-root')[0].value

  if(baseUrl) {
    baseUrl += '/';
  } 
  var complete = false;

  var checkStatus = function() {
    $.get(baseUrl + 'reports/'+reportReference+'/status?penalty_type='+penaltyType, function(response) {
      if(response.completed) {
        complete = true;
        window.location = baseUrl+'reports/'+reportReference+'?penalty_type='+penaltyType;
      }
    });
    if(!complete) {
      window.setTimeout(checkStatus, 5000);
    }
  };
  checkStatus();
});
