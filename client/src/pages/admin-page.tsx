import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Character } from "@shared/schema";

interface AdminAuth {
  username: string;
  password: string;
}

interface UserAnalytics {
  totalUsers: number;
  totalPaidUsers: number;
  totalFreeUsers: number;
  registeredButNoMessages: number;
  partialFreeMessages: number;
  completedFreeNoPayment: number;
  averageMessagesPerUser: number;
  conversionRate: number;
  dailySignups: number;
  weeklySignups: number;
  monthlySignups: number;
}

interface DetailedUser {
  id: number;
  username: string;
  coins: number;
  totalMessages: number;
  lastLoginAt: string | null;
  createdAt: string;
  isPaid: boolean;
  paymentCount: number;
}

interface EditCharacterData {
  id: number;
  name: string;
  avatar: string;
  intro: string;
  systemPrompt: string;
  isActive: boolean;
}

interface CreateCharacterData {
  name: string;
  key: string;
  avatar: string;
  intro: string;
  systemPrompt: string;
}

export default function AdminPage() {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [showPaidUsersOnly, setShowPaidUsersOnly] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<EditCharacterData | null>(null);
  const [newApiKey, setNewApiKey] = useState("");

  const { data: analytics } = useQuery<UserAnalytics>({
    queryKey: ["/api/admin/analytics"],
    enabled: isLoggedIn,
  });

  const { data: userList } = useQuery<DetailedUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: isLoggedIn && showUserList,
  });

  const { data: characters } = useQuery<Character[]>({
    queryKey: ["/api/characters"],
    enabled: isLoggedIn,
  });

  const updateCharacterMutation = useMutation({
    mutationFn: async (character: EditCharacterData) => {
      const res = await apiRequest("PUT", `/api/admin/characters/${character.id}`, character);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      setShowEditModal(false);
      setEditingCharacter(null);
      toast({
        title: "Success",
        description: "Character updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createCharacterMutation = useMutation({
    mutationFn: async (character: CreateCharacterData) => {
      const res = await apiRequest("POST", "/api/admin/characters", character);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      setShowCreateModal(false);
      toast({
        title: "Success",
        description: "Character created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateApiKeyMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const res = await apiRequest("POST", "/api/admin/update-elevenlabs-key", { apiKey });
      return res.json();
    },
    onSuccess: () => {
      setNewApiKey("");
      toast({
        title: "Success",
        description: "ElevenLabs API key updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter({
      id: character.id,
      name: character.name,
      avatar: character.avatar,
      intro: character.intro,
      systemPrompt: character.systemPrompt,
      isActive: character.isActive,
    });
    setShowEditModal(true);
  };

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return "Never";
    return new Date(lastLogin).toLocaleDateString() + " " + new Date(lastLogin).toLocaleTimeString();
  };

  if (!isLoggedIn) {
    return <AdminLogin onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-8">MindTalks Admin Dashboard</h1>
            
            {/* ElevenLabs API Key Update */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="bg-purple-100 text-purple-600 p-2 rounded-lg mr-3">🔑</span>
                Update ElevenLabs API Key
              </h2>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New ElevenLabs API Key
                    </label>
                    <input
                      type="password"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      placeholder="Enter new ElevenLabs API key..."
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <Button
                    onClick={() => updateApiKeyMutation.mutate(newApiKey)}
                    disabled={updateApiKeyMutation.isPending || !newApiKey.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3"
                  >
                    {updateApiKeyMutation.isPending ? "Updating..." : "Update Key"}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  This will update the ElevenLabs API key for voice message generation.
                </p>
              </div>
            </div>
            
            {/* User Analytics Dashboard */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">📊</span>
                User Analytics Dashboard
              </h2>
              
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Users */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total Registered Users</p>
                      <p className="text-3xl font-bold">{analytics?.totalUsers || 0}</p>
                    </div>
                    <div className="text-blue-200 text-2xl">👥</div>
                  </div>
                </div>

                {/* Paid Users */}
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-md cursor-pointer hover:from-green-600 hover:to-green-700 transition-all duration-200"
                  onClick={() => {
                    setShowPaidUsersOnly(true);
                    setShowUserList(true);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Paid Users (Click to view)</p>
                      <p className="text-3xl font-bold">{analytics?.totalPaidUsers || 0}</p>
                    </div>
                    <div className="text-green-200 text-2xl">💰</div>
                  </div>
                </div>

                {/* Free Users */}
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Free Users</p>
                      <p className="text-3xl font-bold">{analytics?.totalFreeUsers || 0}</p>
                    </div>
                    <div className="text-purple-200 text-2xl">🆓</div>
                  </div>
                </div>

                {/* Conversion Rate */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">Conversion Rate</p>
                      <p className="text-3xl font-bold">{analytics?.conversionRate?.toFixed(1) || 0}%</p>
                    </div>
                    <div className="text-orange-200 text-2xl">📈</div>
                  </div>
                </div>
              </div>

              {/* User Behavior Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* User Engagement Stats */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">User Engagement Analysis</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-red-700 font-medium">Registered but No Messages</span>
                      <span className="text-red-800 font-bold text-lg">{analytics?.registeredButNoMessages || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="text-yellow-700 font-medium">Partial Free Messages Used</span>
                      <span className="text-yellow-800 font-bold text-lg">{analytics?.partialFreeMessages || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <span className="text-orange-700 font-medium">Used All Free, No Payment</span>
                      <span className="text-orange-800 font-bold text-lg">{analytics?.completedFreeNoPayment || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-700 font-medium">Average Messages per User</span>
                      <span className="text-blue-800 font-bold text-lg">{analytics?.averageMessagesPerUser?.toFixed(1) || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Signup Trends */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Signup Trends</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-green-700 font-medium">Today's Signups</span>
                      <span className="text-green-800 font-bold text-lg">{analytics?.dailySignups || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-700 font-medium">This Week's Signups</span>
                      <span className="text-blue-800 font-bold text-lg">{analytics?.weeklySignups || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-700 font-medium">This Month's Signups</span>
                      <span className="text-purple-800 font-bold text-lg">{analytics?.monthlySignups || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Insights */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-indigo-800 mb-4">💡 Quick Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="text-indigo-700">
                    <strong>User Conversion:</strong> {analytics?.totalPaidUsers || 0} out of {analytics?.totalUsers || 0} users have made payments
                  </div>
                  <div className="text-indigo-700">
                    <strong>Engagement Issue:</strong> {analytics?.registeredButNoMessages || 0} users never sent a message
                  </div>
                  <div className="text-indigo-700">
                    <strong>Potential Revenue:</strong> {analytics?.completedFreeNoPayment || 0} users exhausted free messages but didn't pay
                  </div>
                  <div className="text-indigo-700">
                    <strong>Growth Rate:</strong> {analytics?.dailySignups || 0} new users today vs {analytics?.weeklySignups || 0} this week
                  </div>
                </div>
              </div>

              {/* Metrics Explanation */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-yellow-800 mb-2">📋 Column Explanations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-yellow-700">
                  <div><strong>Messages Used:</strong> Total messages sent across all chats</div>
                  <div><strong>Coins Left:</strong> Current coin balance remaining</div>
                  <div><strong>Payments Made:</strong> Number of payment transactions</div>
                  <div><strong>Last Login "Never":</strong> User signed up but never logged in</div>
                </div>
              </div>

              {/* User List Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {showPaidUsersOnly ? 'Paid Users List' : 'Detailed User List'}
                      {userList && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({userList.filter(user => showPaidUsersOnly ? user.isPaid : true).length} users)
                        </span>
                      )}
                    </h3>
                    {showUserList && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          onClick={() => setShowPaidUsersOnly(false)}
                          variant={!showPaidUsersOnly ? "default" : "outline"}
                          size="sm"
                        >
                          All Users
                        </Button>
                        <Button
                          onClick={() => setShowPaidUsersOnly(true)}
                          variant={showPaidUsersOnly ? "default" : "outline"}
                          size="sm"
                        >
                          Paid Users Only
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      setShowUserList(!showUserList);
                      if (!showUserList) setShowPaidUsersOnly(false);
                    }}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white"
                  >
                    {showUserList ? 'Hide User List' : 'View User List'}
                  </Button>
                </div>
                
                {showUserList && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left text-sm font-medium text-gray-500 py-3">Username</th>
                          <th className="text-left text-sm font-medium text-gray-500 py-3">Status</th>
                          <th className="text-left text-sm font-medium text-gray-500 py-3" title="Total messages sent by user">Messages Used</th>
                          <th className="text-left text-sm font-medium text-gray-500 py-3" title="Current coin balance remaining">Coins Left</th>
                          <th className="text-left text-sm font-medium text-gray-500 py-3" title="Number of payments made">Payments Made</th>
                          <th className="text-left text-sm font-medium text-gray-500 py-3" title="Last time user logged in (Never = signed up but never logged in)">Last Login</th>
                          <th className="text-left text-sm font-medium text-gray-500 py-3">Account Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userList?.filter(user => showPaidUsersOnly ? user.isPaid : true).map((user) => (
                          <tr key={user.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="py-3 text-sm font-medium text-gray-900">{user.username}</td>
                            <td className="py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.isPaid 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {user.isPaid ? 'Paid' : 'Free'}
                              </span>
                            </td>
                            <td className="py-3 text-sm text-gray-900">{user.totalMessages}</td>
                            <td className="py-3 text-sm text-gray-900">{user.coins}</td>
                            <td className="py-3 text-sm text-gray-900">{user.paymentCount}</td>
                            <td className="py-3 text-sm text-gray-500">
                              {user.lastLoginAt 
                                ? new Date(user.lastLoginAt).toLocaleDateString() + " " + new Date(user.lastLoginAt).toLocaleTimeString()
                                : "Never"
                              }
                            </td>
                            <td className="py-3 text-sm text-gray-500">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                        {userList && userList.filter(user => showPaidUsersOnly ? user.isPaid : true).length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-gray-500">
                              {showPaidUsersOnly ? 'No paid users found' : 'No users found'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Character Management */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Character Management</h2>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  Add New Character
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {characters?.map((character) => (
                  <div key={character.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <img
                        src={character.avatar}
                        alt={character.name}
                        className="w-12 h-12 rounded-full object-cover mr-3"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-800">{character.name}</h3>
                        <span className={`text-sm px-2 py-1 rounded ${
                          character.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {character.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {character.intro}
                    </p>
                    <Button
                      onClick={() => handleEditCharacter(character)}
                      size="sm"
                      className="w-full"
                    >
                      Edit Character
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Character Modal */}
        {showEditModal && editingCharacter && (
          <EditCharacterModal
            character={editingCharacter}
            onSave={(character) => updateCharacterMutation.mutate(character)}
            onCancel={() => {
              setShowEditModal(false);
              setEditingCharacter(null);
            }}
            isLoading={updateCharacterMutation.isPending}
          />
        )}

        {/* Create Character Modal */}
        {showCreateModal && (
          <CreateCharacterModal
            onSave={(character) => createCharacterMutation.mutate(character)}
            onCancel={() => setShowCreateModal(false)}
            isLoading={createCharacterMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

// Admin Login Component
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [credentials, setCredentials] = useState<AdminAuth>({
    username: "",
    password: "",
  });
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (auth: AdminAuth) => {
      const res = await apiRequest("POST", "/api/admin/login", auth);
      return res.json();
    },
    onSuccess: () => {
      onLogin();
      toast({
        title: "Success",
        description: "Admin login successful",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(credentials);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Admin Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full romantic-gradient text-white py-3"
          >
            {loginMutation.isPending ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// Create Character Modal Component
function CreateCharacterModal({
  onSave,
  onCancel,
  isLoading,
}: {
  onSave: (character: CreateCharacterData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CreateCharacterData>({
    name: "",
    key: "",
    avatar: "",
    intro: "",
    systemPrompt: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({ ...prev, avatar: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const generateKey = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Create New Character</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Character Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ 
                  ...prev, 
                  name: e.target.value,
                  key: generateKey(e.target.value)
                }));
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Character Key</label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Character Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="mt-2 w-20 h-20 object-cover rounded-md"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Introduction</label>
            <textarea
              value={formData.intro}
              onChange={(e) => setFormData(prev => ({ ...prev, intro: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md h-20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">System Prompt (Personality)</label>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md h-32"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isLoading ? "Creating..." : "Create Character"}
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Character Modal Component
function EditCharacterModal({
  character,
  onSave,
  onCancel,
  isLoading,
}: {
  character: EditCharacterData;
  onSave: (character: EditCharacterData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState(character);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(character.avatar);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({ ...prev, avatar: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Edit Character</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Character Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Character Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="mt-2 w-20 h-20 object-cover rounded-md"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Introduction</label>
            <textarea
              value={formData.intro}
              onChange={(e) => setFormData(prev => ({ ...prev, intro: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md h-20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">System Prompt (Personality)</label>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md h-32"
              required
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="form-checkbox"
              />
              <span className="text-sm font-medium">Active Character</span>
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isLoading ? "Updating..." : "Update Character"}
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}