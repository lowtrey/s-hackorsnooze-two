// TODO: change anonymous funcs to named for event listeners

$(async function () {
  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();
  addNavHandlers();

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
   * Event listener for logging in.
   *  If successful we will setup the user instance
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
   *  If successful we will setup a new user instance
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

    updateContent("#myStories");
    $("#addStory").trigger("reset");

    // Style Active Nav Link
    $("#nav-addStory").removeClass("active");
    $("#nav-myStories").addClass("active");
  });

  /**
   * Event handler for Favoriting / Unfavoriting Story
   */
  $("body").on("click", "#favorite", async function (event) {
    const favoriteId = $(event.target).parent().attr("id");
    const updatedUser = await currentUser.updateFavorites(favoriteId);
    currentUser = updatedUser;

    updateContent("#favorites");

    // Style Active Nav Link
    $("#nav-allStories").removeClass("active");
    $("#nav-favorites").addClass("active");
  });

  /**
   * Event handler for Deleting Stories
   */
  $("body").on("click", "#myStories #delete", async function (event) {
    const deleteId = $(event.target).parent().attr("id");
    await storyList.deleteStory(currentUser.loginToken, deleteId);

    await checkIfLoggedIn();
    updateContent("#myStories");

    // Style Active Nav Link
    $("#nav-allStories").removeClass("active");
    $("#nav-myStories").addClass("active");
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */
  async function checkIfLoggedIn() {
    // Check localStorage for login info
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
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
   * which will generate a storyListInstance. Then append each Story to the DOM.
   * If there is a current user, append own stories and favorites as well
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
      // loop through user's own stories and favorites
      for (let story of currentUser.ownStories) {
        const result = generateStoryHTML(story, false, true);
        $("#myStories").append(result);
      }
      for (let story of currentUser.favorites) {
        const result = generateStoryHTML(story, true);
        $("#favorites").append(result);
      }
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */
  function generateStoryHTML(story, isFavorite = false, isOwnStory = false) {
    const hostName = getHostName(story.url);
    const { author, storyId, title, url, username } = story;

    // Conditional rendering of delete and favorite icons
    const deleteClass = isOwnStory ? "fas fa-trash trash-can" : "hidden";
    const favoriteClass = isFavorite
      ? "fas fa-star star favorited"
      : "fas fa-star star";

    // Render story markup
    const storyMarkup = $(`
      <li id="${storyId}">
        <i id="favorite" class="${favoriteClass}"></i>
        <i id="delete" class="${deleteClass}"></i>
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

  /**
   * Hide elements, generate stories,
   *  show element with passed in ID
   */
  async function updateContent(elementId) {
    hideElements();
    await checkIfLoggedIn();
    $(elementId).show();
  }

  /* Hide all elements in elementIdArr */
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

  /* Function to pull the hostname from a URL */
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

  /* Sync current user information to localStorage */
  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
