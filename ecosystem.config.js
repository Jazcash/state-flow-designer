module.exports = {
    apps: [{
        name: "state-flow-designer",
        script: "npm start",
        env: {
            NODE_ENV: "development",
        },
        env_production: {
            NODE_ENV: "production",
        }
    }]
}