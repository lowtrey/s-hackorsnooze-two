$(async function () {
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
  $("#loginForm").on("submit", async function (evt) {
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
  $("#createAccountForm").on("submit", async function (evt) {
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
  $("#addStory").on("submit", async function (evt) {
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
    $("#addStory").trigger("reset");
  });

  /**
   * Log Out Functionality
   */
  $("#nav-logout").on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */
  $("#nav-login").on("click", function () {
    // Show the Login and Create Account Forms
    $("#loginForm").slideToggle();
    $("#createAccountForm").slideToggle();
    $("#allStories").toggle();
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
   * Event handler for Favoriting / Unfavoriting Articles
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
    $("#loginForm").hide();
    $("#createAccountForm").hide();

    // reset those forms
    $("#loginForm").trigger("reset");
    $("#createAccountForm").trigger("reset");

    // show the stories
    $("#allStories").show();

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
    $("#favorites").empty();
    $("#allStories").empty();
    $("#myStories").empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $("#allStories").append(result);
    }

    if (currentUser) {
      // loop through all of our stories and generate HTML for them
      for (let story of currentUser.ownStories) {
        const result = generateStoryHTML(story);
        $("#myStories").append(result);
      }
      // loop through all of our stories and generate HTML for them
      for (let story of currentUser.favorites) {
        const result = generateStoryHTML(story);
        $("#favorites").append(result);
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
    const elementIdArr = [
      "#addStory",
      "#allStories",
      "#favorites",
      "#filtered",
      "#myStories",
      "#loginForm",
      "#create-account-form",
      "#userProfile",
    ];
    elementIdArr.forEach((elementId) => $(elementId).hide());
  }

  function showInfoForLoggedInUser() {
    $("#nav-login").hide();
    $("#nav-logout").show();
    $("#nav-left").show();
    $("#nav-welcome").show();

    $("#nav-userProfile").text(currentUser.username);
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
