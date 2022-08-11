// global variables
var localUser = "USER STATUS: no logged in user";
var currentRoomAdmin = [];

$("#background").hide();
var socketio = io.connect();

//kick user out of chat
function kickUser()
{
    let selectedUser = document.getElementById("selectUser").value;

    if(selectedUser == localUser)
    {
        alert("ACTION DENIED| You cannot kick yourself out of the room");
    }
    else if(currentRoomAdmin.includes(selectedUser))
    {
        alert("ACTION DENIED| You cannot kick CREATOR nor other ADMIN out of the room");
    }
    else
    {
        console.log("CLIENT| USER " + localUser + " kicking USER " + selectedUser);

        socketio.emit("kickUser_to_server", {"sender": localUser,"user":selectedUser, "roomname":document.getElementById("chatname").innerText}); 
    }
}

//ban user from chat
function banUser()
{
    let selectedUser = document.getElementById("selectUser").value;

    if(selectedUser == localUser)
    {
        alert("ACTION DENIED| You cannot ban yourself out of the room");
    }
    else if(currentRoomAdmin.includes(selectedUser))
    {
        alert("ACTION DENIED| You cannot ban CREATOR nor other ADMIN out of the room");
    }
    else
    {
        console.log("CLIENT| USER " + localUser + " banning USER " + selectedUser);

        socketio.emit("banUser_to_server", {"admin": localUser,"user":selectedUser, "roomname":document.getElementById("chatname").innerText});
    }
}

//grant user admin access
function addAdmin()
{
    let selectedUser = document.getElementById("selectUser").value;

    if(selectedUser == localUser)
    {
        alert("ACTION DENIED| You cannot make yourself ADMIN.")
    }
    else if(currentRoomAdmin.includes(selectedUser))//checking if selectedUser already an admin
    {
        alert("ACTION DENIED| USER "+selectedUser+" is already an ADMIN.")
    }
    else
    {
        console.log("CLIENT| ADMIN " + localUser + " granting ADMIN privileges to USER " + selectedUser);

        socketio.emit("addAdmin_to_server", {"admin": localUser,"user":selectedUser, "roomname":document.getElementById("chatname").innerText});

        alert("ADMIN privileges has been granted to USER " + selectedUser + " by USER " + localUser);
    }
}

//demote admin to user
function removeAdmin()
{
    let selectedUser = document.getElementById("selectUser").value;

    if(selectedUser == localUser)
    {
        alert("ACTION DENIED| You cannot demote yourself.")
    }
    else if(!currentRoomAdmin.includes(selectedUser))//checking if selectedUser already an admin
    {
        alert("ACTION DENIED| USER "+selectedUser+" is not currently an ADMIN.")
    }
    else
    {
        console.log("CLIENT| ADMIN " + localUser + " removing ADMIN privileges from USER " + selectedUser);

        socketio.emit("removeAdmin_to_server", {"admin": localUser,"user":selectedUser, "roomname":document.getElementById("chatname").innerText});

        alert("ADMIN privileges has been removed from USER " + selectedUser + " by USER " + localUser);
    }
}

//send private message to another user
function dmUser()
{
    //select options
    let selectedUser = document.getElementById("selectUser").value;

    console.log("CLIENT| USER " + localUser + " sending private messsage to USER " + selectedUser);

    // prompt message
    let message = prompt("Please enter your private message to "+selectedUser + " below.");

    socketio.emit("dmUser_to_server", {"sender": localUser,"user":selectedUser, "roomname":document.getElementById("chatname").innerText, "message": message});
}

//handles direct message 
socketio.on("privateMessage_to_client",function(data) 
{
    alert(data["sender"]+ " from ROOM " + data["roomname"] + " sent the following message to you: " + data["message"]);
});

//handles server usage message
socketio.on("usageMessage_to_client",function(data) 
{
    alert(data);
});

//update currentRoomAdmin[]
socketio.on("updateAdmin_to_client",function(data) 
{
    currentRoomAdmin = data;
});

//update chat user list on screen
socketio.on("updateUserList_to_client",function(data) 
{
    //clear user lists
    var userListDOM = document.getElementById("chatUserList");
    var userOptionsDOM = document.getElementById("selectUser");

    while(userListDOM.firstChild)
    {
        userListDOM.removeChild(userListDOM.firstChild);
        userOptionsDOM.remove(0);
    }

    //update lists
    for (var u of data)
    {
        var userElement = document.createElement("li");
        userElement.innerText = u;

        var userOption = document.createElement("option");
        userOption.text = u;
        userOption.value = u;
        userOptionsDOM.add(userOption);

        userListDOM.appendChild(userElement);
    }        
});

// open Chat Room on client side
socketio.on("openRoom_to_client",function(data) 
{
    console.log("CLIENT| opening chatroom "+data["roomname"]);

    resetChat();
    $("#liveChat").show();
    $("#background").show();
    $("chatrooms").hide();
    $("logoutBtn").hide();
    $("createBtn").hide();

    hideAdminPanel();

    //display chat name
    document.getElementById("chatname").innerText = data["roomname"];

    //display room creator
    document.getElementById("chatCreator").innerText = "CREATOR: "+data["creator"];

    //display user
    document.getElementById("chatUser").innerText = localUser;

    //CHECK if user = creator
    if(localUser == data["creator"])
    {
        //display kick and ban buttons
        console.log("CLIENT| admin panel opened");
        showAdminPanel();
    }
    else // check if user is admin
    {
        // tell server to update currentRoomAdmin[]
        socketio.emit("updateAdmin_to_server", {"user": localUser,"roomname": data["roomname"]});

        //if list includes local user, display ban and kick buttons
        if(currentRoomAdmin.includes(localUser))
        {
            document.getElementById("kickBtn").style.display ="inline-block";
            document.getElementById("banBtn").style.display ="inline-block";
        }
    }

    //show current users in the chat room
    var userListDOM = document.getElementById("chatUserList");
    var userOptionsDOM = document.getElementById("selectUser");
    console.log(userOptionsDOM);

    //use for loop to generate <li> and <options>
    var userList = data["members"];

    for (var u of userList)
    {
        var userElement = document.createElement("li");
        userElement.innerText = u;
        userListDOM.appendChild(userElement);

        var userOption = document.createElement("option");
        userOption.text = u;
        userOption.value = u;
        userOptionsDOM.add(userOption);
    }
});

//clear chat messages and member list
function resetChat()
{
    // clear member list on screen
    var userListDOM = document.getElementById("chatUserList");
    var userOptionsDOM = document.getElementById("selectUser");

    while(userListDOM.firstChild)
    {
        userListDOM.removeChild(userListDOM.firstChild);
        userOptionsDOM.remove(0);
    }

    // clear chat
    var messages = document.querySelectorAll('.messages');
    messages.forEach(m => 
    {
        m.remove();
    });

    var lines = document.querySelectorAll('hr');
    lines.forEach(l => 
    {
        l.remove();
    });
}

function showAdminPanel()
{
    document.getElementById("kickBtn").style.display ="inline-block";
    document.getElementById("banBtn").style.display ="inline-block";
    document.getElementById("addAdminBtn").style.display ="inline-block";
    document.getElementById("removeAdminBtn").style.display ="inline-block";
}

function hideAdminPanel()
{
    document.getElementById("kickBtn").style.display ="none";
    document.getElementById("banBtn").style.display ="none";
    document.getElementById("addAdminBtn").style.display ="none";
    document.getElementById("removeAdminBtn").style.display ="none";
}

// using clicked the leave button
function leaveChat()
{
    //tell server that user has left chat
    socketio.emit("leaveRoom_to_server", {"user":localUser, "roomname":document.getElementById("chatname").innerText});

    //hide live chat from user + return home
    resetChat();
    hideAdminPanel();
    $("#liveChat").hide();
    $("#background").hide();

    // return home
    fetchRooms()
    $("chatrooms").show();
    $("logoutBtn").show();
    $("createBtn").show();
}

// send kicked user home
socketio.on("closeRoom_to_client",function(data) 
{
    //hide live chat from user + return home
    resetChat();
    hideAdminPanel();
    $("#liveChat").hide();
    $("#background").hide();

    // return home
    fetchRooms()
    $("chatrooms").show();
    $("logoutBtn").show();
    $("createBtn").show();
});

// display existing chat rooms for new user
function fetchRooms()
{
    socketio.emit("fetchRooms_to_server", {"user":localUser});
}

//display all live chatrooms
socketio.on("displayAllRooms_to_client",function(data) 
{
    if(localUser != "USER STATUS: no logged in user")
    {
        console.log("CLIENT| receiving rooms data from server")
        console.log("SERVER|There are " + Object.keys(data).length + " live chat rooms.");
        console.log(data);

        //clear room DOM on screen before updating
        clearRooms();

        console.log("CLIENT| displaying all rooms in server");
        for(r in data)
        {
            // r is "roomname", the key
            console.log(data[r]);

            var roomlist = document.getElementById("chatrooms");
            var room = document.createElement("div");
            room.classList.add("room");

            var name = document.createElement("div");
            name.classList.add("roomname");
            name.innerText = r;

            var creator = document.createElement("div");
            creator.classList.add("roomowner");
            creator.innerText = data[r]["creator"];

            var deleteButton = document.createElement("button");
            deleteButton.classList.add("deleteBtn");
            deleteButton.innerText = "DELETE";
            deleteButton.setAttribute("onclick","deleteRoom(event)");
            deleteButton.setAttribute("value", data["roomname"]);

            var joinButton = document.createElement("button");
            joinButton.classList.add("joinBtn");
            joinButton.innerText = "JOIN";
            joinButton.setAttribute("onclick","joinRoom(event)");
            joinButton.setAttribute("value", r);

            room.appendChild(name);
            room.appendChild(creator);
            room.appendChild(joinButton);
            room.appendChild(deleteButton);
            roomlist.appendChild(room);
        }
    }
});

// clear all displayed chatrooms on screen
function clearRooms()
{
    // clear chat
    var rooms = document.querySelectorAll('.room');

    rooms.forEach(r => 
    {
        r.remove();
    });
}

socketio.on("message_to_client",function(data) 
{
    console.log("CLIENT| client received message \"" + data["message"]+ "\" by user " + data["user"]+" from server");

    document.getElementById("chatlog").appendChild(document.createElement("hr"));

    //create message div
    let message = document.createElement("div");
    message.classList.add("messages");
    let user = document.createElement("span");
    user.innerText = data["user"] + ": ";
    message.appendChild(user);
    message.appendChild(document.createTextNode(data['message']));
    
    document.getElementById("chatlog").appendChild(message);
});

//display newly created room to client
socketio.on("displayRoom_to_client",function(data) 
{
    // <div class="room">
    //    <div class="roomname">ROOMNAME</div>
    //    <div class="roomowner">OWNER</div>
    //    <button class="joinBtn">JOIN</button>
    // </div>

    if(localUser != "USER STATUS: no logged in user")
    {
        console.log("CLIENT| displaying new room called \"" + data["roomname"] + "\"by " + data["creator"]);

        var roomlist = document.getElementById("chatrooms");
        var room = document.createElement("div");
        room.classList.add("room");

        var name = document.createElement("div");
        name.classList.add("roomname");
        name.innerText = data["roomname"];

        var creator = document.createElement("div");
        creator.classList.add("roomowner");
        creator.innerText = data["creator"];

        var deleteButton = document.createElement("button");
        deleteButton.classList.add("deleteBtn");
        deleteButton.innerText = "DELETE";
        deleteButton.setAttribute("onclick","deleteRoom(event)");
        deleteButton.setAttribute("value", data["roomname"]);

        var joinButton = document.createElement("button");
        joinButton.classList.add("joinBtn");
        joinButton.innerText = "JOIN";
        joinButton.setAttribute("onclick","joinRoom(event)");
        joinButton.setAttribute("value", data["roomname"]);

        room.appendChild(name);
        room.appendChild(creator);
        room.appendChild(joinButton);
        room.appendChild(deleteButton);
        roomlist.appendChild(room);
    }
});

function deleteRoom(event)
{
    console.log("CLIENT| USER " + localUser + " requesting to delete ROOM \""+event.target.value+"\"");

    socketio.emit("deleteRoom_to_server", {"user":localUser,"roomname":event.target.value});
}

function joinRoom(event)
{
    console.log("CLIENT| USER " + localUser + " requesting to join ROOM \""+event.target.value+"\"");

    socketio.emit("joinRoom_to_server", {"user":localUser,"roomname":event.target.value});
}

// prompt private room password
socketio.on("askRoomPassword_to_client",function(data) 
{
    //prompt user input
    let input = prompt("This is a private room. Please enter the password to ROOM " + data["roomname"] + " to enter.");

    //check password
    if(input == data["password"])
    {
        //tell server that user has entered correct password
        socketio.emit("joinPrivateRoom_to_server", {"user":localUser,"roomname":data["roomname"]});
    }
    else
    {
        //usage message
        alert("ROOM ACCESS DENIED| you entered the wrong password for private ROOM " + data["roomname"]);
    }
});

//pass client input to user (user + message content)
function sendMessage()
{
    var msg = document.getElementById("message_input").value;
    var room = document.getElementById("chatname").innerText;
    
    socketio.emit("message_to_server", {"message":msg, "user":localUser, "roomname": room});
}

function openChat()
{
    $("#openChatForm").modal("show");
    console.log("CLIENT| new room form opened");
}

// log user out
function logOut()
{
    console.log("CLIENT| logging user out");

    //let server know that user has logged out***
    socketio.emit("logout_to_server", {"user":localUser});

    localUser = "USER STATUS: no logged in user";
    updateScreen();
    $("#loginBtn").show();
    $("#logoutBtn").hide();
    $("#createBtn").hide();

    resetChat();
    clearRooms();
}

function submitChat()
{
    // e.preventDefault();

    console.log("CLIENT| user is creating room now");

    //get room name
    var name = document.getElementById("roomname").value;
    console.log("roomname: " + name);

    //check input for web security

    //get room type (private vs public)
    var type = document.querySelector('input[name="chatType"]:checked').value;

    if(type == "private")
    {
        //get password
        var password = document.getElementById("roomPassword").value;
        console.log("password: " + password);
        
        //check user input***

        //send chatroom info to server
        console.log("CLIENT| sending private room info to server");
        socketio.emit("createPrivate_to_server", {"type":"private", "creator":localUser,"roomname":name, "password":password});
    }
    else if (type == "public")
    {
        console.log("CLIENT| sending public room info to server");
        socketio.emit("createPublic_to_server", {"type":"public", "creator":localUser,"roomname":name});
    }

    //RESET
    //close create-chat-form
    $.modal.close();
}

function displayChatroom()
{
    document.getElementById("liveChat").style.display= "block";
}

function openPasswordPrompt()
{
    document.getElementById("passwordPrompt").style.display = "inline-block";
}

function closePasswordPrompt()
{
    document.getElementById("passwordPrompt").style.display = "none";
}

function openLogin()
{
    console.log("CLIENT| user opened the login form")
    $("#loginform").modal("show");
}

function submitLogin()
{
    console.log("CLIENT| sending new user info to the server")
    // filter user inputs for web security

    var input = document.getElementById("username").value;

    // check for empty username
    if(input == "") 
    {
        alert("INVALID USERNAME| username cannot be empty");
    }
    else //valid
    {
        //pass user info to server
        socketio.emit("createUser_to_server", {"user":input});
        document.getElementById("username").value ="";
        $.modal.close();
    }
}

socketio.on("succesLogin_to_client",function(data) 
{
    console.log("CLIENT| USER " + data["user"]+" from server");
    localUser = data["user"];
    updateScreen();
    $("#logoutBtn").show();
    $("#createBtn").show();
    $("#loginBtn").hide();
    fetchRooms();
    $.modal.close();
});

function updateScreen()
{
    if(localUser != "USER STATUS: no logged in user")
    {
        document.getElementById("currentUser").innerText = localUser;
        $("#loginBtn").hide();
    }
    else
    {
        document.getElementById("currentUser").innerText = "USER STATUS: no logged in user";

        $("#logoutBtn").hide();
        $("#createBtn").hide();
        $("#loginBtn").show();
    }
}

updateScreen();