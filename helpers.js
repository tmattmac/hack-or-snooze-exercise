/* simple function to pull the hostname from a URL */

function getHostName(url) {
  let hostName;
  if (url.indexOf("://") > -1) {
    hostName = url.split("/")[2];
  } else {
    hostName = url.split("/")[0];
  }
  if (hostName.slice(0, 4) === "www.") {
    hostName = hostName.slice(4);
  }
  return hostName;
}

/* format date for display on user profile page */

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

/* extract API error message from JS error object */
function extractErrorMessage(error) {
  return error.response.data.error.message;
}