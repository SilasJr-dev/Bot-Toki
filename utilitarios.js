//FUNCTIONS
const adminsGroup = (userNumber, participants) => {
    const user = participants.find((participant) => participant.id._serialized == userNumber)

    if (user ===  undefined) return false
    return user.isAdmin
}


//
module.exports = {
    adminsGroup
}