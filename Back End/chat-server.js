// Require the packages we will use:
const http = require("http"),
    fs = require("fs");

const port = 3456;
const file = "client.html";
// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html, on port 3456:
const server = http.createServer(function (req, res) {
    // This callback runs when a new connection is made to our HTTP server.

    fs.readFile(file, function (err, data) {
        // This callback runs when the client.html file has been read from the filesystem.

        if (err) return res.writeHead(500);
        res.writeHead(200);
        res.end(data);
    });
});
server.listen(port);

// Import Socket.IO and pass our HTTP server object to it.
const socketio = require("socket.io")(http, {
    wsEngine: 'ws'
});


var clients = [];
// roomname: {creator, members[], banned[], password}
var rooms = {};

// Attach our Socket.IO server to our HTTP server to listen
const io = socketio.listen(server);
io.sockets.on("connection", function (socket) 
{
    console.log("SERVER| socket ID is "+socket.id);
    // This callback runs when a new Socket.IO connection is established.

    socket.on("message_to_server", function (data) 
    {
        console.log("SERVER| received new MESSAGE \"" + data["message"] + "\" by USER"+ data["user"]);

        // only broadcast messages to users in that room
        io.sockets.in(data["roomname"]).emit("message_to_client", { user: data["user"], message: data["message"] });
    });

    socket.on("createUser_to_server", function (data) 
    {
        console.log("SERVER| receiving new user info");
        console.log("user: " + data["user"] + " created!");

        //check user existence to prevent redundancy
        if(!clients.includes(data["user"]))
        {
            //store user to clients[]
            clients[data["user"]] = {"id": socket.id, "currentRoom": "home"};
            console.log("SEVER| USER " + data["user"] +" successfully logged in");

            io.to(socket.id).emit("succesLogin_to_client", {"user": data["user"]});
        }
        else
        {
            io.to(socket.id).emit("usageMessage_to_client", "INVALID USERNAME| Username already in use, please try again.");
        }
    });

    socket.on("logout_to_server", function (data) 
    {
        console.log("SERVER| logging USER "+ data["user"] + "out!");
        console.log(clients);
        delete clients[data["user"]];
        console.log(clients);
    });

    socket.on("createPublic_to_server", function (data) 
    {   
        //roomname: {type, creator, members[], banned[], password}

        //add new room to rooms[]
        rooms[data["roomname"]] = { "type": data["type"] ,"creator": data["creator"], "members": [], "banned": [], "admin":[data["creator"]]};

        //display newly created chatroom entry to screen 
        console.log("SERVER | telling client to display room to screen");

        io.sockets.emit("displayRoom_to_client", { creator: data["creator"], roomname: data["roomname"]});

        console.log("SERVER | creator: " + data["creator"]+ " just created a new public room named " + data["roomname"] );
    });

    socket.on("createPrivate_to_server", function (data) 
    {   
        //add new room to rooms[]
        rooms[data["roomname"]] = { "type": data["type"], "password": data["password"],"creator": data["creator"], "members": [], "banned": [], "admin":[data["creator"]]};

        //display newly created chatroom entry to screen 
        console.log("SERVER | telling client to display room to screen");

        io.sockets.emit("displayRoom_to_client", { "creator": data["creator"], "roomname": data["roomname"]});

        console.log("SERVER | creator: " + data["creator"]+ " just created a new private room named " + data["roomname"] );
    });

    socket.on("deleteRoom_to_server", function (data) 
    {   
        console.log("SERVER| USER " + data["user"] + " received client request to delete ROOM \""+data["roomname"]+"\"");

        //check if user has access to delete
        if(data["user"] == rooms[data["roomname"]]["creator"])
        {
            console.log("SERVER| delete access permitted USER " + data["user"] + " deleting ROOM \""+data["roomname"]+"\"");

            //return all clients in that chat room back to home
            for(c in clients)
            {
                if(clients[c]["currentRoom"] == data["roomname"])
                {
                    clients[c]["currentRoom"] = "home";

                    //disattach all sockets in this deleted room
                    io.sockets.sockets.get(clients[c]["id"]).leave(data["roomname"]);
                }
            }

            //inform all users in the room that room has been deleted
            io.to(data["roomname"]).emit("usageMessage_to_client", "ROOM \""+data["roomname"]+"\" has been deleted by its creator. Please leave chat room and return home");

            //delete room from rooms[]
            delete rooms[data["roomname"]];

            //tell client to update rooms
            io.sockets.emit("displayAllRooms_to_client", rooms);
        }
        else
        {
            //tell client that user has no access deleting the room
            io.to(clients[data["user"]]["id"]).emit("usageMessage_to_client", "ACCESS DENIED| You cannot delete this room.");
        }

    });

    socket.on("joinRoom_to_server", function (data) 
    {   
        // check if it's banned user ***
        if(rooms[data["roomname"]]["banned"].includes(data["user"]))
        {
            //tell client that user has been banned from entering the room
            io.to(clients[data["user"]]["id"]).emit("usageMessage_to_client", "ACCESS DENIED| You have been BANNED from this room.");
        }
        else
        {
            console.log("SERVER| USER " + data["user"] + " received client request to join ROOM \""+data["roomname"]+"\"");

            console.log(rooms[data["roomname"]]);

            //check if user have access to join the room ***
            if(rooms[data["roomname"]]["type"] == "private" && data["user"] != rooms[data["roomname"]]["creator"])
            {
                //prompt password
                io.to(clients[data["user"]]["id"]).emit("askRoomPassword_to_client", {"roomname": data["roomname"], "password": rooms[data["roomname"]]["password"]});
            }
            else
            {
                socket.join(data["roomname"]);
                clients[data["user"]]["currentRoom"] = data["roomname"];

                //add user to rooms' members [] if not already in the room
                if(!rooms[data["roomname"]]["members"].includes(data["user"]))
                {
                    rooms[data["roomname"]]["members"].push(data["user"]);
                }

                console.log(clients[data["user"]]["id"]);

                // tell client to open chat room
                io.to(clients[data["user"]]["id"]).emit("openRoom_to_client", { "creator": rooms[data["roomname"]]["creator"], "roomname": data["roomname"], "members": rooms[data["roomname"]]["members"]});

                //update user list to all client in this room
                io.to(data["roomname"]).emit("updateUserList_to_client", rooms[data["roomname"]]["members"]);
            }
        }
    });

    socket.on("joinPrivateRoom_to_server", function (data) 
    {   
        console.log("SERVER| USER " + data["user"] + " joining private ROOM \""+data["roomname"]+"\"");

        // check if it's banned user ***
        // check if user has been temporarily kicked out ***

        socket.join(data["roomname"]);
        clients[data["user"]]["currentRoom"] = data["roomname"];

        //add user to rooms' members [] if not already in the room
        if(!rooms[data["roomname"]]["members"].includes(data["user"]))
        {
            rooms[data["roomname"]]["members"].push(data["user"]);
        }

        // tell client to open chat room
        io.to(clients[data["user"]]["id"]).emit("openRoom_to_client", { "creator": rooms[data["roomname"]]["creator"], "roomname": data["roomname"], "members": rooms[data["roomname"]]["members"]});

        //update user list to all client in this room
        io.to(data["roomname"]).emit("updateUserList_to_client", rooms[data["roomname"]]["members"]);
    });

    socket.on("leaveRoom_to_server", function (data) 
    {   
        console.log("SERVER| USER " + data["user"] + " received client request to leave ROOM \""+data["roomname"]+"\"");

        //remove socket from room
        io.sockets.sockets.get(clients[data["user"]]["id"]).leave(data["roomname"]);

        // change client current room to home
        clients[data["user"]]["currentRoom"] = "home";

        //remove user from room's user list
        rooms[data["roomname"]]["members"].splice(rooms[data["roomname"]]["members"].indexOf(data["user"]),1);

        console.log(rooms[data["roomname"]]["members"]);

        //update room user list
        io.to(data["roomname"]).emit("updateUserList_to_client", rooms[data["roomname"]]["members"]);
    });

    //pass room list to client
    socket.on("fetchRooms_to_server", function (data) 
    {   
        console.log("SERVER|There are " + Object.keys(rooms).length + " live chat rooms.");

        io.to(clients[data["user"]]["id"]).emit("displayAllRooms_to_client", rooms);
    });

    socket.on("addAdmin_to_server", function (data) 
    {   
        console.log("SERVER| admin adding " + data["user"] + " as ADMIN " + data["roomname"]);
        
        //store new admin to rooms
        rooms[data["roomname"]]["admin"].push(data["user"]);

        //tell client to update admin panel
        io.to(data["roomname"]).emit("updateAdmin_to_client", rooms[data["roomname"]]["admin"]);

        //tell user that hes been made admin
        io.to(clients[data["user"]]["id"]).emit("usageMessage_to_client", "You have been promoted to ADMIN of ROOM " + data["roomname"] + ". Please leave room and join again to gain ADMIN previleges.");
    });

    socket.on("removeAdmin_to_server", function (data) 
    {   
        console.log("SERVER| admin adding " + data["user"] + " as ADMIN " + data["roomname"]);
        
        //store new admin to rooms
        rooms[data["roomname"]]["admin"].splice( rooms[data["roomname"]]["admin"].indexOf(data["user"]),1);

        //tell client to update admin panel
        io.to(data["roomname"]).emit("updateAdmin_to_client", rooms[data["roomname"]]["admin"]);

        //tell user that hes been made admin
        io.to(clients[data["user"]]["id"]).emit("usageMessage_to_client", "You have been demoted to regular USER of ROOM " + data["roomname"] + ". Please leave room.");

        //close chat
        //remove socket from room
        io.sockets.sockets.get(clients[data["user"]]["id"]).leave(data["roomname"]);

        // change client current room to home
        clients[data["user"]]["currentRoom"] = "home";

        //remove user from room's user list
        rooms[data["roomname"]]["members"].splice(rooms[data["roomname"]]["members"].indexOf(data["user"]),1);

        //tell client to close chat
        io.to(clients[data["user"]]["id"]).emit("closeRoom_to_client", "You have been kicked out of the room.");

        //update room user list
        io.to(data["roomname"]).emit("updateUserList_to_client", rooms[data["roomname"]]["members"]);
    });

    socket.on("updateAdmin_to_server", function (data) 
    {   
        console.log("SERVER| updating admin users list in ROOM" + data["roomname"]);
        
        io.to(clients[data["user"]]["id"]).emit("updateAdmin_to_client", rooms[data["roomname"]]["admin"]);
    });

    socket.on("kickUser_to_server", function (data) 
    {   
        console.log("SERVER| admin kicking " + data["user"] + " out of ROOM " + data["roomname"]);

        //remove socket from room
        io.sockets.sockets.get(clients[data["user"]]["id"]).leave(data["roomname"]);

        // change client current room to home
        clients[data["user"]]["currentRoom"] = "home";

        //remove user from room's user list
        rooms[data["roomname"]]["members"].splice(rooms[data["roomname"]]["members"].indexOf(data["user"]),1);

        console.log(rooms[data["roomname"]]["members"]);

        //send usage message to let user know that they been kicked out
        io.to(clients[data["user"]]["id"]).emit("usageMessage_to_client", "You have been kicked out of the room.");

        //tell client to close chat
        io.to(clients[data["user"]]["id"]).emit("closeRoom_to_client", "You have been kicked out of the room.");

        //update room user list
        io.to(data["roomname"]).emit("updateUserList_to_client", rooms[data["roomname"]]["members"]);
    });

    socket.on("banUser_to_server", function (data) 
    {   
        console.log("SERVER| admin bans " + data["user"] + " from ROOM " + data["roomname"]);

        //add to user banned list
        rooms[data["roomname"]]["banned"].push(data["user"]);

        //remove socket from room
        io.sockets.sockets.get(clients[data["user"]]["id"]).leave(data["roomname"]);

        // change client current room to home
        clients[data["user"]]["currentRoom"] = "home";

        //remove user from room's user list
        rooms[data["roomname"]]["members"].splice(rooms[data["roomname"]]["members"].indexOf(data["user"]),1);

        console.log(rooms[data["roomname"]]["members"]);

        //send usage message to let user know that they been kicked out
        io.to(clients[data["user"]]["id"]).emit("usageMessage_to_client", "You have been BANNED from the room.");

        //tell client to close chat
        io.to(clients[data["user"]]["id"]).emit("closeRoom_to_client", "You have been kicked out of the room.");

        //update room user list
        io.to(data["roomname"]).emit("updateUserList_to_client", rooms[data["roomname"]]["members"]);
    });

    socket.on("dmUser_to_server", function (data) 
    {   
        console.log("SERVER| USER "+ data["sender"] + " sending private message to USER " + data["user"]);

        io.to(clients[data["user"]]["id"]).emit("privateMessage_to_client",{"sender": data["sender"], "message": data["message"], "roomname": data["roomname"]});
    });
});