const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    /* ========= CORE CONTENT ========= */

    description: {
      type: String,
      required: true,
      maxlength: 1000
    },

    image: {
      type: String, 
      default: null
    },

    /* ========= POST TYPE ========= */

    isUserPost: {
        type: Boolean,
        default: true
    },

    userDisplayName: {
        type: String,
        default: null
    },

    isChannelPost: {
        type: Boolean,
        default: false
    },

    channelName: {
        type: String,
        default: null
    },


    /* ========= IDENTITY ========= */

    federatedId: {
      type: String,
      required: true,
      unique: true
    },

    originServer: {
      type: String,
      required: true
    },

    serverName: {
      type: String,
      required: true
    },

    /* ========= FEDERATION ========= */

    isRemote: {
      type: Boolean,
      default: false
    },

    federationStatus: {
      type: String,
      enum: ["local", "queued", "sent", "received"],
      default: "local"
    },

    federatedTo: {
      type: [
        {
          serverName: String,
          serverUrl: String,
          federatedAt: Date
        }
      ],
      default: []
    },

    /* ========= INTERACTIONS ========= */

    likeCount: {
      type: Number,
      default: 0
    },

    likedBy: {
      type: [String], // federated user IDs
      default: []
      // example: "bob@food", "alice@sports"
    },

    comments: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

/* ========= INDEXES ========= */

postSchema.index({ serverName: 1, createdAt: -1 });

postSchema.index({ originServer: 1 });

postSchema.index({ likedBy: 1 });

if (isUserPost) {
  isChannelPost = false;
  channelName = null;
}

if (isChannelPost) {
  isUserPost = false;
  userDisplayName = null;
}


module.exports = mongoose.model("Post", postSchema);
