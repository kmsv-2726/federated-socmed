import mongoose from "mongoose";

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

    images: {
      type: [String],
      default: [],
      validate: [arr => arr.length <= 4, 'Maximum 4 images allowed']
    },

    isEditable: {
      type: Boolean,
      default: true
    },

    /* ========= POST TYPE ========= */

    isUserPost: {
      type: Boolean,
      default: true
    },

    isRepost: {
      type: Boolean,
      default: false
    },

    originalPostFederatedId: {
      type: String,
      default: null
    },

    originalAuthorFederatedId: {
      type: String,
      default: null
    },

    userDisplayName: {
      type: String,
      default: null
    },

    // Stable ownership reference — used for authorization checks
    authorFederatedId: {
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
    },

    comments: {
      type: [
        {
          displayName: {
            type: String,
            required: true
          },

          image: {
            type: String,
            default: null
          },

          content: {
            type: String,
            required: true,
            maxlength: 500
          },

          createdAt: {
            type: Date,
            default: Date.now
          },
          commentFederatedId: {
            type: String,
            required: true
          },

          originServer: {
            type: String,
            required: true
          }
        }
      ],
      default: []
    },
  },
  {
    timestamps: true
  }
);

/* ========= INDEXES ========= */

// postSchema.index({ serverName: 1, createdAt: -1 });

// postSchema.index({ originServer: 1 });

// postSchema.index({ likedBy: 1 });


export default mongoose.model("Post", postSchema);
