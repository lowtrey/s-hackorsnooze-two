$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#allStories");
  const $addStoryForm = $("#addStory");
  const $filteredArticles = $("#filtered-articles");
  const $favoritedArticles = $("#favorites");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#myStories");
  const $navLeft = $("#nav-left");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navWelcome = $("#nav-welcome");
  const $navUser = $("#nav-userProfile");
  const $userProfile = $("#userProfile");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();
  addNavHandlers();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */
  $loginForm.on("submit", async function (evt) {
    evt.preventDefault();

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */
  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    const name = $("#create-account-name").val();
    const username = $("#create-account-username").val();
    const password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for adding new story.
   *  If successfully we will add a new story to the all stories list
   *  and the user's own stories list.
   */
  $addStoryForm.on("submit", async function (evt) {
    evt.preventDefault();

    // grab the required fields
    const submittedStory = {
      author: $("#author").val(),
      title: $("#title").val(),
      url: $("#url").val(),
    };

    // call the addStory method, which calls the API and returns a newly created story
    await storyList.addStory(currentUser, submittedStory);

    updateContent("#allStories");
    $addStoryForm.trigger("reset");
  });

  /**
   * Log Out Functionality
   */
  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */
  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Add Event Handler To Navigation Links
   */
  function addNavHandlers() {
    const navElementIds = [
      "allStories",
      "favorites",
      "myStories",
      "userProfile",
      "addStory",
    ];

    // Add Click Handler To Each Element
    for (let elementId of navElementIds) {
      const navLinkId = `#nav-${elementId}`;

      $("body").on("click", navLinkId, () => {
        updateContent(`#${elementId}`);

        // Style Active Nav Link
        $(navLinkId).closest("nav").find("a.active").removeClass("active");
        $(navLinkId).addClass("active");
      });
    }
  }

  /**
   * Hide elements, generate stories,
   *  show element with passed in ID
   */
  async function updateContent(elementId) {
    hideElements();
    await checkIfLoggedIn();
    $(elementId).show();
  }

  /**
   * Event handler for Favoriting Articles
   */
  $("body").on("click", "#favorite", async function (event) {
    const favoriteId = $(event.target).parent().attr("id");
    const updatedUser = await currentUser.updateFavorites(favoriteId);
    currentUser = updatedUser;

    updateContent("#allStories");
  });

  /**
   * Event handler for Deleting Articles
   */
  $("body").on("click", "#myStories #delete", async function (event) {
    const deleteId = $(event.target).parent().attr("id");
    await storyList.deleteStory(currentUser.loginToken, deleteId);

    await checkIfLoggedIn();
    updateContent("#allStories");
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
    await generateStories();

    if (currentUser) {
      showInfoForLoggedInUser();
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
    $allStoriesList.show();

    // update the navigation bar
    showInfoForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */
  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();

    // update our global variable
    storyList = storyListInstance;

    // empty out that part of the page
    $favoritedArticles.empty();
    $allStoriesList.empty();
    $ownStories.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }

    if (currentUser) {
      // loop through all of our stories and generate HTML for them
      for (let story of currentUser.ownStories) {
        const result = generateStoryHTML(story);
        $ownStories.append(result);
      }
      // loop through all of our stories and generate HTML for them
      for (let story of currentUser.favorites) {
        const result = generateStoryHTML(story);
        $favoritedArticles.append(result);
      }
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */
  function generateStoryHTML(story) {
    const hostName = getHostName(story.url);
    const { author, storyId, title, url, username } = story;

    // render story markup
    const storyMarkup = $(`
      <li id="${storyId}">
        <i id="favorite" class="fas fa-star star"></i>
        <i id="delete" class="fas fa-trash trash-can"></i>
        <a class="article-link" href="${url}" target="a_blank">
          <strong>${title}</strong>
        </a>
        <small class="article-author">by ${author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */
  function hideElements() {
    const elementsArr = [
      $addStoryForm,
      $allStoriesList,
      $favoritedArticles,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile,
    ];
    elementsArr.forEach(($elem) => $elem.hide());
  }

  function showInfoForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navLeft.show();
    $navWelcome.show();

    $navUser.text(currentUser.username);
    $("#profile-name").text(currentUser.name);
    $("#profile-username").text(currentUser.username);
    $("#profile-account-date").text(currentUser.createdAt);
  }

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

  /* sync current user information to localStorage */
  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
