// let auth0Client;

// const initAuth0 = async () => {
//     auth0Client = await auth0.createAuth0Client({
//         domain: "dev-ls0yufjhxj01r8uw.us.auth0.com",
//         clientId: "h3ExHdMvqjRSlEi16l35zKPlxtBxee5F",
//         authorizationParams: {
//             redirect_uri: window.location.origin
//         }
//     });

//     return auth0Client;
// };

// const setupEventListeners = () => {
//     // Assumes a button with id "login" in the DOM
//     const loginButton = document.getElementById("login");
//     loginButton.addEventListener("click", (e) => {
//         e.preventDefault();
//         auth0Client.loginWithRedirect();
//     });

//     // Assumes a button with id "logout" in the DOM
//     const logoutButton = document.getElementById("logout");
//     logoutButton.addEventListener("click", (e) => {
//         e.preventDefault();
//         auth0Client.logout();
//     });
// };

// const updateUI = async () => {
//     const isAuthenticated = await auth0Client.isAuthenticated();
//     const userProfile = isAuthenticated ? await auth0Client.getUser() : null;
    
//     // Assumes an element with id "profile" in the DOM
//     const profileElement = document.getElementById("profile");
//     const loginButton = document.getElementById("login");
//     const logoutButton = document.getElementById("logout");

//     if (isAuthenticated) {
//         profileElement.style.display = "block";
//         loginButton.style.display = "none";
//         logoutButton.style.display = "block";
//         // profileElement.innerHTML = `<p>${userProfile.name}</p><img src="${userProfile.picture}" />`;
//     } else {
//         profileElement.style.display = "none";
//         loginButton.style.display = "block";
//         logoutButton.style.display = "none";
//     }
// };

// const loadSpecialContent = async () => {
//     try {
//         const token = await auth0Client.getTokenSilently(); // Get the Auth0 token
//         const response = await fetch('/api/load_endpoint_not_there_yet', {
//             headers: {
//                 Authorization: `Bearer ${token}`
//             }
//         });

//         if (!response.ok) {
//             throw new Error('Unable to fetch special content');
//         }

//         const content = await response.text();
//         document.getElementById('special-content').innerHTML = content;
//     } catch (error) {
//         console.error('Error loading special content', error);
//     }
// };

// const main = async () => {
//     await initAuth0();
//     setupEventListeners();
//     await updateUI();

//     if (await auth0Client.isAuthenticated()) {
//         loadSpecialContent();
//     }
// };

// document.addEventListener('DOMContentLoaded', (event) => {
//     main();
// });

let globalUserEmail = '';
let globalToken = '';

document.addEventListener('DOMContentLoaded', (event) => {

    const updateDropdown = (watchlists) => {
        const dropdown = document.getElementById('optionsDropdown');
        dropdown.innerHTML = ''; // Clear existing options
    
        watchlists.forEach(watchlist => {
            const option = document.createElement('option');
            option.value = watchlist;
            option.text = watchlist;
            dropdown.appendChild(option);
        });
    };

    const sendTokenToServer = async (token, userEmail, userLanguage) => {
        try {
            const response = await fetch('/api/login_content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ token: token, email: userEmail, language: userLanguage})
            });

            if (response.ok) {
                const responseData = await response.json();
                console.log('User data:', responseData);

                globalUserEmail = userEmail;
                globalToken = token;

                // load watchlists that user has access to
                const allWatchlists = [...responseData['public_watchlists'], ...responseData['user_watchlists']];
                updateDropdown(allWatchlists);

            } else {
                console.error('Server responded with an error:', response.status);
            }
        } catch (error) {
            console.error('Error sending token to server:', error);
        }
    };


    auth0.createAuth0Client({
        domain: "dev-ls0yufjhxj01r8uw.us.auth0.com",
        clientId: "h3ExHdMvqjRSlEi16l35zKPlxtBxee5F",
        authorizationParams: {
        redirect_uri: window.location.origin
        }
    }).then(async (auth0Client) => {
        // Assumes a button with id "login" in the DOM
        const loginButton = document.getElementById("login");
    
        loginButton.addEventListener("click", (e) => {
        e.preventDefault();
        auth0Client.loginWithRedirect();
        });
    
        if (location.search.includes("state=") && 
            (location.search.includes("code=") || 
            location.search.includes("error="))) {
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, "/");
        }
    
        // Assumes a button with id "logout" in the DOM
        const logoutButton = document.getElementById("logout");
    
        logoutButton.addEventListener("click", (e) => {
        e.preventDefault();
        auth0Client.logout();
        });
    
        const isAuthenticated = await auth0Client.isAuthenticated();
        const userProfile = await auth0Client.getUser();
        const userEmail = userProfile.email; // Retrieve user email
        const userLanguage = userProfile.locale; // Retrieve user email

        console.log('Authenticated: ', isAuthenticated)
    
        // Assumes an element with id "profile" in the DOM
        if (isAuthenticated) {
            loginButton.style.display = "none";
            logoutButton.style.display = "block";
            //   profileElement.innerHTML = `
            //           <p>${userProfile.name}</p>
            //           <img src="${userProfile.picture}" />
            //         `;

            const token = await auth0Client.getTokenSilently();
            sendTokenToServer(token, userEmail, userLanguage);

        } else {
        profileElement.style.display = "none";

        }
    });

});