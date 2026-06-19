const swaggerUi = require("swagger-ui-express");

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Netflix Subscription & Screen Management API",
    version: "1.0.0",
    description: "API documentation for the Netflix-like Subscription, Screen Session tracking, and Admin Dashboard stats backend.",
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Development Server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token in the format: <token>",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Error message details" },
          data: { type: "object", nullable: true, example: null },
        },
      },
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation completed successfully" },
          data: { type: "object", nullable: true },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    "/api/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        description: "Creates an unverified user, hashes the password, generates a 6-digit OTP, and sends a verification email.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "dateOfBirth", "gender", "email", "password"],
                properties: {
                  username: { type: "string", example: "john_doe" },
                  dateOfBirth: { type: "string", format: "date", example: "1990-01-01" },
                  gender: { type: "string", example: "male" },
                  email: { type: "string", format: "email", example: "user@example.com" },
                  password: { type: "string", example: "StrongP@ss1" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User registered – OTP sent to email",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "User registered – OTP sent to email" },
                    data: { type: "object", example: {} },
                  },
                },
              },
            },
          },
          409: {
            description: "User already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          422: {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/verify-email": {
      post: {
        tags: ["Auth"],
        summary: "Verify user email",
        description: "Accepts the email and OTP, marks the user as verified if the OTP is valid and not expired.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "otp"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                  otp: { type: "string", example: "123456" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Email verified successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Email verified successfully" },
                    data: { type: "object", example: {} },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid or expired OTP",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          404: {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/resend-verification-otp": {
      post: {
        tags: ["Auth"],
        summary: "Resend verification OTP",
        description: "Generates and sends a fresh 6-digit OTP to an unverified user.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "New verification OTP sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "A new verification OTP has been sent to your email" },
                    data: { type: "object", nullable: true, example: null },
                  },
                },
              },
            },
          },
          400: {
            description: "Email is already verified",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          404: {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in",
        description: "Authenticates a verified user and returns a signed JWT.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                  password: { type: "string", example: "StrongP@ss1" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful – JWT returned",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Login successful" },
                    data: {
                      type: "object",
                      properties: {
                        token: { type: "string" },
                        user: { type: "object" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          403: {
            description: "Email not yet verified",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out",
        description: "Blacklists the current JWT so it can no longer be used.",
        responses: {
          200: {
            description: "Logged out successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          401: {
            description: "No token or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request a password reset",
        description: "Generates a new OTP, saves it to the user document, and sends it via email.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OTP sent to email",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Password reset OTP sent to your email" },
                    data: { type: "object", nullable: true, example: null },
                  },
                },
              },
            },
          },
          404: {
            description: "No account found with this email",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password",
        description: "Verifies the OTP and updates the user's password.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "otp", "newPassword"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                  otp: { type: "string", example: "123456" },
                  newPassword: { type: "string", example: "NewStr0ng@Pass" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Password reset successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          400: {
            description: "Invalid or expired OTP",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          404: {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get logged-in user details",
        description: "Returns the profile data of the currently authenticated user.",
        responses: {
          200: {
            description: "User details retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "User details retrieved successfully" },
                    data: {
                      type: "object",
                      properties: {
                        username: { type: "string", example: "john_doe" },
                        email: { type: "string", format: "email", example: "user@example.com" },
                        dateOfBirth: { type: "string", example: "1990-01-01" },
                        gender: { type: "string", example: "male" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          404: {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/users": {
      get: {
        tags: ["Auth"],
        summary: "Get all users",
        description: "Returns a list of all users in the system.",
        responses: {
          200: {
            description: "Users retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Users retrieved successfully" },
                    data: {
                      type: "array",
                      items: { type: "object" },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/screens/start": {
      post: {
        tags: ["Screens"],
        summary: "Register and start a video stream on a device/screen",
        description: "Verifies user's active subscription and validates that concurrent screen limits are not exceeded. Cleans up any stale sessions (sessions without heartbeats in the past 2 minutes) first. Rejects the request if the screen limit for the user's subscription tier has already been reached.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["deviceId", "screenName"],
                properties: {
                  deviceId: { type: "string", example: "laptop-chrome-xyz123" },
                  screenName: { type: "string", example: "Living Room TV" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Streaming session registered and started successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Streaming started successfully" },
                    data: {
                      type: "object",
                      properties: {
                        session: { type: "object" },
                        activeScreensCount: { type: "number", example: 1 },
                        maxScreensAllowed: { type: "number", example: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
          403: {
            description: "Access denied. Subscription inactive or screen limit reached.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          404: {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/screens/heartbeat": {
      post: {
        tags: ["Screens"],
        summary: "Send periodic streaming heartbeat",
        description: "Updates the active stream's lastHeartbeat timestamp to keep the session from timing out. Recommended frequency is every 30-60 seconds.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["deviceId"],
                properties: {
                  deviceId: { type: "string", example: "laptop-chrome-xyz123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Heartbeat received and streaming session extended",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          404: {
            description: "Stream session not found or timed out",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/screens/stop": {
      post: {
        tags: ["Screens"],
        summary: "Stop streaming and release screen allocation",
        description: "Terminates the stream session for the specified device and frees up a concurrent screen slot immediately.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["deviceId"],
                properties: {
                  deviceId: { type: "string", example: "laptop-chrome-xyz123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Streaming stopped and screen session freed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          404: {
            description: "Session not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/screens/active": {
      get: {
        tags: ["Screens"],
        summary: "Retrieve currently active screens streaming for user",
        description: "Returns a list of all active streaming screens for the authenticated user, excluding any stale timed-out sessions.",
        responses: {
          200: {
            description: "Active screen sessions retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Active screen streaming sessions retrieved successfully" },
                    data: {
                      type: "array",
                      items: { type: "object" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/subscriptions/plans": {
      get: {
        tags: ["Subscriptions"],
        summary: "Retrieve active subscription plans",
        description: "Returns a list of all active Netflix subscription plans (Basic, Standard, Premium) available for signup.",
        security: [],
        responses: {
          200: {
            description: "Active plans retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Subscription plans retrieved successfully" },
                    data: {
                      type: "array",
                      items: { type: "object" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Subscriptions"],
        summary: "Create a new subscription plan (Admin only)",
        description: "Creates a new subscription tier with price, screen limit, resolution, and quality indicators.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "price", "maxScreens"],
                properties: {
                  name: { type: "string", example: "Super Premium" },
                  price: { type: "number", example: 1999 },
                  maxScreens: { type: "number", example: 6 },
                  resolution: { type: "string", example: "4K+HDR" },
                  videoQuality: { type: "string", example: "Best" },
                  description: { type: "string", example: "Stream on 6 screens concurrently in high fidelity." },
                  isActive: { type: "boolean", example: true },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Subscription plan created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          403: {
            description: "Forbidden. Admin access required.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          409: {
            description: "Plan name already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/subscriptions/admin/plans": {
      get: {
        tags: ["Subscriptions"],
        summary: "Retrieve all subscription plans (Admin only)",
        description: "Returns a list of all subscription plans, including inactive ones.",
        responses: {
          200: {
            description: "Plans retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Plans retrieved successfully" },
                    data: {
                      type: "array",
                      items: { type: "object" },
                    },
                  },
                },
              },
            },
          },
          403: {
            description: "Forbidden. Admin access required.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/subscriptions/plans/{id}": {
      put: {
        tags: ["Subscriptions"],
        summary: "Update a subscription plan (Admin only)",
        description: "Modifies price, resolution, screen count, or details of a plan.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Plan ID to update",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  price: { type: "number", example: 1599 },
                  maxScreens: { type: "number", example: 5 },
                  isActive: { type: "boolean", example: true },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Subscription plan updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          404: {
            description: "Plan not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Subscriptions"],
        summary: "Delete a subscription plan (Admin only)",
        description: "Removes a plan from the database.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Plan ID to delete",
          },
        ],
        responses: {
          200: {
            description: "Subscription plan deleted successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          404: {
            description: "Plan not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/subscriptions/subscribe": {
      post: {
        tags: ["Subscriptions"],
        summary: "Purchase or change subscription plan",
        description: "Subscribes the authenticated user to a plan. Updates active screen allowance and records a payment transaction in history.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["planId"],
                properties: {
                  planId: { type: "string", example: "647de952ab9a4f4efb1e3e78" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Subscribed successfully. Payment registered.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Subscribed successfully" },
                    data: {
                      type: "object",
                      properties: {
                        subscription: { type: "object" },
                        transactionId: { type: "string" },
                        amountPaid: { type: "number", example: 1439 },
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: "User or plan not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/subscriptions/cancel": {
      post: {
        tags: ["Subscriptions"],
        summary: "Cancel active subscription",
        description: "Cancels the user's active subscription immediately, reverts status to Free, and disconnects all currently streaming screens.",
        responses: {
          200: {
            description: "Subscription cancelled successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          400: {
            description: "User does not have an active subscription",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/admin/dashboard-stats": {
      get: {
        tags: ["Admin"],
        summary: "Retrieve administrative dashboard analytics (Admin only)",
        description: "Provides a detailed overview of the platform's vital telemetry data (user counts, stream sessions, MRR, transactions, and lists of live items).",
        responses: {
          200: {
            description: "Dashboard statistics compiled successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Admin dashboard statistics retrieved successfully" },
                    data: {
                      type: "object",
                      properties: {
                        summary: {
                          type: "object",
                          properties: {
                            totalUsers: { type: "number", example: 120 },
                            activeUsersCount: { type: "number", example: 18 },
                            activeSubscribersCount: { type: "number", example: 85 },
                            activeStreamsCount: { type: "number", example: 12 },
                            totalRevenue: { type: "number", example: 125900 },
                            estimatedMRR: { type: "number", example: 95400 },
                          },
                        },
                        planDistribution: {
                          type: "array",
                          items: { type: "object" },
                        },
                        activeUsersList: {
                          type: "array",
                          items: { type: "object" },
                        },
                        activeScreensList: {
                          type: "array",
                          items: { type: "object" },
                        },
                        recentTransactions: {
                          type: "array",
                          items: { type: "object" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized. Invalid or missing token.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          403: {
            description: "Forbidden. Requires administrative privileges.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/movies/homepage": {
      get: {
        tags: ["Movies"],
        summary: "Retrieve categorized movies for the homepage",
        description: "Returns lists of movies grouped into Netflix-style categories (featured Hero Banner, Trending Now, Top Rated, Continue Watching, My List, Recently Added, Recommended, and genres).",
        responses: {
          200: {
            description: "Categorized movies retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Homepage movies retrieved successfully" },
                    data: {
                      type: "object",
                      properties: {
                        heroBanner: { type: "object" },
                        trendingNow: { type: "array", items: { type: "object" } },
                        continueWatching: { type: "array", items: { type: "object" } },
                        topRated: { type: "array", items: { type: "object" } },
                        actionMovies: { type: "array", items: { type: "object" } },
                        comedyMovies: { type: "array", items: { type: "object" } },
                        horrorMovies: { type: "array", items: { type: "object" } },
                        recentlyAdded: { type: "array", items: { type: "object" } },
                        myList: { type: "array", items: { type: "object" } },
                        recommendedForYou: { type: "array", items: { type: "object" } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/movies/{id}": {
      get: {
        tags: ["Movies"],
        summary: "Retrieve detailed movie object by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Movie ID"
          }
        ],
        responses: {
          200: {
            description: "Movie details retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" }
              }
            }
          },
          404: {
            description: "Movie not found"
          }
        }
      }
    },
    "/api/movies/my-list": {
      post: {
        tags: ["Movies"],
        summary: "Add a movie to the user's My List",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["movieId"],
                properties: {
                  movieId: { type: "string", example: "movie_001" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Movie added to My List successfully"
          },
          404: {
            description: "Movie not found"
          }
        }
      }
    },
    "/api/movies/my-list/{id}": {
      delete: {
        tags: ["Movies"],
        summary: "Remove a movie from the user's My List",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Movie ID to remove"
          }
        ],
        responses: {
          200: {
            description: "Movie removed from My List successfully"
          }
        }
      }
    },
    "/api/movies/continue-watching": {
      post: {
        tags: ["Movies"],
        summary: "Update user's progress tracking for a movie",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["movieId", "progress"],
                properties: {
                  movieId: { type: "string", example: "movie_001" },
                  progress: { type: "number", example: 45 }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Continue watching progress updated successfully"
          },
          404: {
            description: "Movie not found"
          }
        }
      }
    },
    "/api/admin/movies": {
      post: {
        tags: ["Admin Content Management"],
        summary: "Create a new movie record (Admin only)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "description", "thumbnail", "banner", "videoUrl", "genre", "category"],
                properties: {
                  title: { type: "string", example: "Inception" },
                  description: { type: "string", example: "A thief who steals corporate secrets..." },
                  thumbnail: { type: "string", example: "http://localhost:5000/uploads/thumb.png" },
                  banner: { type: "string", example: "http://localhost:5000/uploads/banner.jpg" },
                  videoUrl: { type: "string", example: "http://localhost:5000/uploads/trailer.mp4" },
                  genre: { type: "string", example: "Action" },
                  category: { type: "string", example: "Trending" },
                  rating: { type: "number", example: 8.8 },
                  year: { type: "number", example: 2010 },
                  featured: { type: "boolean", example: true },
                  trending: { type: "boolean", example: true }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: "Movie created successfully"
          },
          403: {
            description: "Forbidden. Requires administrative privileges."
          }
        }
      }
    },
    "/api/admin/movies/{id}": {
      put: {
        tags: ["Admin Content Management"],
        summary: "Edit an existing movie record (Admin only)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Movie ID"
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  rating: { type: "number" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Movie updated successfully"
          },
          404: {
            description: "Movie not found"
          }
        }
      },
      delete: {
        tags: ["Admin Content Management"],
        summary: "Delete a movie record (Admin only)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Movie ID"
          }
        ],
        responses: {
          200: {
            description: "Movie deleted successfully"
          },
          404: {
            description: "Movie not found"
          }
        }
      }
    },
    "/api/admin/movies/upload-thumbnail": {
      post: {
        tags: ["Admin Content Management"],
        summary: "Upload a thumbnail image (Admin only)",
        description: "Uploads a thumbnail image file under form field `thumbnail`.",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  thumbnail: { type: "string", format: "binary" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "File uploaded successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Thumbnail uploaded successfully" },
                    data: {
                      type: "object",
                      properties: {
                        filename: { type: "string" },
                        url: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/admin/movies/upload-banner": {
      post: {
        tags: ["Admin Content Management"],
        summary: "Upload a banner image (Admin only)",
        description: "Uploads a banner image file under form field `banner`.",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  banner: { type: "string", format: "binary" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "File uploaded successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Banner uploaded successfully" },
                    data: {
                      type: "object",
                      properties: {
                        filename: { type: "string" },
                        url: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/admin/movies/upload-trailer": {
      post: {
        tags: ["Admin Content Management"],
        summary: "Upload a trailer video (Admin only)",
        description: "Uploads a video trailer file under form field `trailer`.",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  trailer: { type: "string", format: "binary" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "File uploaded successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Trailer uploaded successfully" },
                    data: {
                      type: "object",
                      properties: {
                        filename: { type: "string" },
                        url: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
  },
};

module.exports = {
  swaggerUi,
  swaggerDocument,
};
