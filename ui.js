$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $userProfile = $("#user-profile");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $favStories = $("#favorited-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navWelcome = $("#nav-welcome");
  const $navUserProfile = $("#nav-user-profile");
  const $navUserFunctions = $("#nav-user-functions");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    try {
      const userInstance = await User.login(username, password);

      // set the global user to the user instance
      currentUser = userInstance;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();
      $('.error').empty().hide();
    } 
    catch (e) {
      const errorText = extractErrorMessage(e);
      $loginForm.find('.error').text(errorText).slideDown();
    }
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    try {
      // call the create method, which calls the API and then builds a new user instance
      const newUser = await User.create(username, password, name);
      currentUser = newUser;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();
    }
    catch (e) {
      const errorText = extractErrorMessage(e);
      $createAccountForm.find('.error').text(errorText).slideDown();
    }
  });

  /**
   * Story submission form
   */

  $submitForm.on("submit", async function(evt) {
    evt.preventDefault();

    // get required fields
    let author = $("#author").val();
    let title = $("#title").val();
    let url = $("#url").val();

    // package them in an API-friendly format
    const newStory = { author, title, url };

    // add the story via the API (also adds story to in-memory user story list)
    await StoryList.addStory(currentUser, newStory);

    // clear form
    $submitForm.trigger('reset');

    // show main page
    hideElements();
    await generateFrontpageStories();
    $allStoriesList.show();
  });

  /**
   * Log Out Functionality
   */

  function logout() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  }

  /**
   * Event handler for navigation
   */

  $("nav").on("click", "a", async function(evt) {
    hideElements();
    switch (evt.currentTarget.id) {
      case 'nav-all':
        await generateFrontpageStories();
        $allStoriesList.show();
        break;
      case 'nav-user-profile':
        $userProfile.show();
        break;
      case 'nav-submit-story':
        $submitForm.show();
        break;
      case 'nav-user-favorites':
        renderStories($favStories, currentUser.favorites.values());
        if ($favStories.text() === '') $favStories.text('Nothing to see here!');
        $favStories.prev().show();
        $favStories.show();
        break;
      case 'nav-user-stories':
        renderStories($ownStories, currentUser.ownStories.values());
        if ($ownStories.text() === '') $ownStories.text('Nothing to see here!');
        $ownStories.prev().show();
        $ownStories.show();
        break;
      case 'nav-login':
        $loginForm.slideToggle();
        $createAccountForm.slideToggle();
        break;
      case 'nav-logout':
        logout();
    }
  });

  /**
   * Event handler for favorite/unfavorite
   */

  $('.articles-container').on('click', '.fav-button', async function(evt) {

    const $icon = $(evt.currentTarget).children('i');
    const $article = $(evt.currentTarget).parent();
    const articleId = $article.attr('id');
    
    const isFavorited = $article.data('favStory');


    // unfavorite if favorited
    if (isFavorited) {
      try {
        // call user unfavorite method
        await currentUser.unfavoriteStory(articleId);


        // if unfavorited successfully, update UI
        $icon.removeClass('fas').addClass('far');
        $article.data('favStory', false);
      } catch {
        // do nothing, for now
        // pop up an error or something maybe
      }
    }
    // favorite if not favorited
    else {
      try {
        // call user favorite method
        await currentUser.favoriteStory(articleId);

        // if unfavorited successfully, update UI
        $icon.removeClass('far').addClass('fas');
        $article.data('favStory', true);
      } catch {
        // do nothing, for now
        // pop up an error or something maybe
      }
    }

  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateFrontpageStories();

    if (currentUser) {
      showNavForLoggedInUser();
      populateUserProfile();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    generateFrontpageStories();
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
    populateUserProfile();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateFrontpageStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;

    // render stories to main page
    renderStories($allStoriesList, storyList.stories);
  }

  /**
   * A function to render a list of stories
   * accepts a jQuery object as a render target
   * accepts an iterable collection of stories
   */
  function renderStories($renderTarget, stories, clear = true) {

    // empty out that part of the page if specified
    if (clear) $renderTarget.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of stories) {
      const result = generateStoryHTML(story);
      $renderTarget.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // check if the story is a user favorite
    let favIconClass = 'far';
    let dataFav = false;
    if (currentUser && currentUser.favorites.has(story.storyId)) {
      favIconClass = 'fas';
      dataFav = true;
    }

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}" data-fav-story="${dataFav}">
        ${currentUser ? `<a class="fav-button" href="#"><i class="${favIconClass} fa-star"></i></a>` : ''}
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}
      </li>
    `);

    // add delete button if story by current user
    if (currentUser && currentUser.ownStories.has(story.storyId)) {
      // this has accessibility issues but could likely be fixed with some aria stuff
      storyMarkup.find('.article-username').append(`
        <span class="delete-story" data-del-step="0">
          (<a href="#" class="del-story">delete</a><span class="del-confirm">are you sure? <a href="#" class="del-yes">yes</a> / <a href="#" class="del-no">no</a></span>)
        </span>`);
    }

    return storyMarkup;
  }

  /* user flow for deleting story */

  $('.articles-list').on('click', '.delete-story a', async function(evt) {
    $story = $(evt.target).closest('li');
    $delButtons = $(evt.target).closest('.delete-story');

    // if 'delete' clicked, show 'are you sure?' dialog
    if ($delButtons.attr('data-del-step') === '0') {
      $delButtons.attr('data-del-step', '1');
    }
    else if ($delButtons.attr('data-del-step') === '1') {
      // if 'yes' clicked, attempt to delete story and remove from DOM
      if ($(evt.target).hasClass('del-yes')) {
        const storyId = $story.attr('id');
        try {
          await StoryList.deleteStory(currentUser, storyId);
          $story.remove();
        } catch (e) {
          // do nothing for now
        }
      }
      // back to first step if 'no' clicked
      else $delButtons.attr('data-del-step', '0');
    }
  });

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $favStories,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile,
      $favStories.siblings(),
      $ownStories.siblings()
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navWelcome.show();
    $navUserFunctions.show();
    $navUserProfile.text(currentUser.username);
  }

  function populateUserProfile() {
    const name = document.createTextNode(' ' + currentUser.name);
    const username = document.createTextNode(' ' + currentUser.username);
    const accountDate = document.createTextNode(' ' + formatDate(currentUser.createdAt));
    $('#profile-name').append(name);
    $('#profile-username').append(username);
    $('#profile-account-date').append(accountDate);
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }

});