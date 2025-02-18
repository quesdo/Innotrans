// Initialise l'objet STU s'il n'existe pas déjà
var STU = STU || {};

beScript.onStart = function () {
    console.log("Initializing WebTranslator");
    STU.WebTranslator = this;
    console.log("WebTranslator initialized");
}

beScript.onStop = function () {
    console.log("Stopping WebTranslator");
    STU.WebTranslator = undefined;
}

beScript.onAllUIWebMessageReceived = function (iEvent) {
    console.log("WebTranslator received message");
    
    let msg = iEvent.message;
    try {
        if (typeof msg === 'string') {
            msg = JSON.parse(msg);
        }
        console.log("Parsed message:", msg);
    } catch (e) {
        console.error("Error parsing message:", e);
        return;
    }

    // Gestion des changements d'opération
    if (msg.action === "operationChange") {
        if (iEvent.sender) {
            console.log("Sending operation change message:", msg);
            iEvent.sender.sendMessage(JSON.stringify({
                action: "operationChange",
                previousOp: msg.previousOp,
                nextOp: msg.nextOp
            }));
        }
    }

    // Gestion des opérations Next/Reset/Remove
    if (msg.action === "nextOperation") {
        console.log("Next operation:", msg.actor);
        STU.ViveCollab.callOnNext(msg.actor);
    }

    if (msg.action === "resetOperation") {
        console.log("Reset operation:", msg.actor);
        STU.ViveCollab.callOnReset(msg.actor);
    }

    if (msg.action === "removeOperation") {
        console.log("Remove operation:", msg.actor);
        STU.ViveCollab.callOnRemove(msg.actor);
    }

    // Gestion de la visibilité
    if (msg.action === "toggleVisibility") {
        let actor = this.getExperience().getActorByName(msg.actor, true);
        if (actor) {
            console.log("Toggle visibility for:", msg.actor, "to:", msg.visible);
            actor.visible = msg.visible;
            STU.ViveCollab.callToggleVisibility(actor, msg.visible);
        } else {
            console.error("Actor not found:", msg.actor);
        }
    }

    // Gestion des animations
    if (msg.action === "playAnimation") {
        let actor = this.getExperience().getActorByName(msg.actor, true);
        if (actor) {
            let anim = actor.getAnimationByName(msg.animation);
            if (anim) {
                console.log("Playing animation:", msg.animation, "for:", msg.actor);
                anim.play();
                STU.ViveCollab.callPlayAnimation(actor, msg.animation);
            } else {
                console.error("Animation not found:", msg.animation);
            }
        } else {
            console.error("Actor not found:", msg.actor);
        }
    }

    // Gestion de la téléportation
    if (msg.action === "teleport") {
        let actor = this.getExperience().getActorByName(msg.actor, true);
        if (actor) {
            console.log("Teleporting:", msg.actor);
            let teleportTo = actor.getPosition();
            var user = STU.ViveManager.getInstance().getInteractionContextActor();
            
            if (actor.Locations && actor.Locations.ActorToTeleport) {
                actor.Locations.ActorToTeleport.setPosition(teleportTo);
                console.log("Actor teleported");
            } else {
                user.setPosition(teleportTo);
                console.log("User teleported");
            }
            
            STU.ViveCollab.callTeleport(actor);
        } else {
            console.error("Actor not found:", msg.actor);
        }
    }
};

// Fonction utilitaire pour envoyer des messages web
beScript.sendWebMessage = function(message) {
    console.log("Sending web message:", message);
    if (this.webMessageSender) {
        this.webMessageSender.sendMessage(JSON.stringify(message));
        console.log("Message sent successfully");
    } else {
        console.error("Web message sender not available");
    }
};