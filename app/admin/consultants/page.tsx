'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  RefreshCw, 
  User, 
  Calendar, 
  Clock, 
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface ConsultationRequest {
  id: string;
  user_id: string;
  user_email: string;
  consultant_id: string;
  status: string;
  data_sharing_consent: boolean;
  preferred_time_ranges: string[];
  created_at: string;
  consultant: {
    id: string;
    name: string;
    specialty: string;
  } | null;
  recommendation: {
    recommendation_reason: string;
    urgency_level: string;
  } | null;
  shared_data_snapshot: any;
}

const ADMIN_SECRET = 'curez_admin_2025'; // For prototype

export default function AdminConsultantsPage() {
  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedRequest, setSelectedRequest] = useState<ConsultationRequest | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completing, setCompleting] = useState(false);
  
  // Calendar generation state
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [meetingLink, setMeetingLink] = useState('');
  const [generatingCalendar, setGeneratingCalendar] = useState(false);

  useEffect(() => {
    fetchRequests();
    
    // Auto-refresh every 10 seconds if enabled
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchRequests();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`/api/admin/consultation-requests?admin_secret=${ADMIN_SECRET}&status=pending`);
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.requests || []);
        setLastRefresh(new Date());
        
        // Play sound if new requests (optional)
        if (data.requests.length > requests.length) {
          // new Audio('/notification.mp3').play().catch(() => {});
        }
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'destructive';
      case 'confirmed': return 'default';
      case 'completed': return 'secondary';
      default: return 'outline';
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600';
      case 'moderate': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimeRange = (range: string) => {
    return range.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const downloadSharedData = async (request: ConsultationRequest) => {
    if (!request.shared_data_snapshot) return;
    
    try {
      // Download as formatted text file
      const response = await fetch(`/api/admin/consultation-shared-data/${request.id}?admin_secret=${ADMIN_SECRET}`);
      
      if (!response.ok) {
        throw new Error('Failed to download data');
      }
      
      const textContent = await response.text();
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'consultation_data.txt';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading shared data:', error);
      alert('Failed to download consultation data');
    }
  };

  const handleCompleteConsultation = async () => {
    if (!selectedRequest) return;

    setCompleting(true);

    try {
      const response = await fetch('/api/admin/complete-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: selectedRequest.id,
          completion_notes: completionNotes.trim() || null,
          admin_secret: ADMIN_SECRET,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setRequests(prev =>
          prev.map(req =>
            req.id === selectedRequest.id
              ? { ...req, status: 'completed' }
              : req
          )
        );
        
        // Close modal and reset
        setShowCompleteModal(false);
        setSelectedRequest(null);
        setCompletionNotes('');
        
        // Refresh to get updated data
        fetchRequests();
      } else {
        alert(data.error || 'Failed to complete consultation');
      }
    } catch (error) {
      console.error('Error completing consultation:', error);
      alert('Failed to complete consultation. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  const handleGenerateCalendar = async () => {
    if (!selectedRequest || !meetingDate || !meetingTime || !meetingLink) {
      alert('Please fill in all required fields');
      return;
    }

    setGeneratingCalendar(true);

    try {
      const response = await fetch('/api/admin/generate-calendar-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: selectedRequest.id,
          meeting_date: meetingDate,
          meeting_time: meetingTime,
          duration_minutes: parseInt(durationMinutes),
          meeting_link: meetingLink,
          admin_secret: ADMIN_SECRET,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate calendar file');
      }

      // Get the .ics file content
      const icsContent = await response.text();
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'consultation.ics';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('Calendar file downloaded! Please email it to the user.');
    } catch (error) {
      console.error('Error generating calendar:', error);
      alert('Failed to generate calendar file. Please try again.');
    } finally {
      setGeneratingCalendar(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Consultation Requests</h1>
            <p className="text-muted-foreground mt-1">
              Admin Dashboard - Real-time Monitoring
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Disable' : 'Enable'} Auto-Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRequests}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Auto-Refresh</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{autoRefresh ? 'ON' : 'OFF'}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Updates every 10 seconds
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Live</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                System operational
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
                <p className="text-muted-foreground">
                  All consultation requests have been processed.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {requests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        User: {request.user_email || request.user_id}
                      </CardTitle>
                      <CardDescription>
                        Requesting: {request.consultant?.name || 'Unknown Consultant'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      {request.recommendation && (
                        <Badge variant="outline" className={getUrgencyColor(request.recommendation.urgency_level)}>
                          {request.recommendation.urgency_level}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Recommendation Reason */}
                  {request.recommendation && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>AI Recommendation:</strong> {request.recommendation.recommendation_reason}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Request Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Submitted:</span>
                        <span className="text-muted-foreground">
                          {new Date(request.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Data Sharing:</span>
                        <Badge variant={request.data_sharing_consent ? 'default' : 'secondary'}>
                          {request.data_sharing_consent ? 'Full Profile' : 'Basic Only'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="font-medium">Preferred Times:</span>
                          <ul className="text-muted-foreground ml-4 mt-1 space-y-1">
                            {request.preferred_time_ranges.map((range, idx) => (
                              <li key={idx}>• {formatTimeRange(range)}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    {request.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => setSelectedRequest(request)}
                          className="flex-1"
                        >
                          View Details & Respond
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowCompleteModal(true);
                            setCompletionNotes('');
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Complete
                        </Button>
                      </>
                    )}
                    {request.status === 'completed' && (
                      <div className="flex-1 text-center py-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 inline mr-2 text-green-600" />
                        Consultation Completed
                      </div>
                    )}
                    {request.shared_data_snapshot && (
                      <Button
                        variant="outline"
                        onClick={() => downloadSharedData(request)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Download Data (Text)
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Completion Modal */}
        {showCompleteModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-lg w-full">
              <CardHeader>
                <CardTitle>Mark Consultation as Completed</CardTitle>
                <CardDescription>
                  Request ID: {selectedRequest.id} | User: {selectedRequest.user_email}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This will mark the consultation as completed. The user's recommendation status will also be updated.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Completion Notes (Optional)
                  </label>
                  <Textarea
                    placeholder="e.g., Session went well, user showed progress..."
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCompleteModal(false);
                      setSelectedRequest(null);
                      setCompletionNotes('');
                    }}
                    disabled={completing}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCompleteConsultation}
                    disabled={completing}
                    className="flex-1"
                  >
                    {completing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Selected Request Modal (simplified for prototype) */}
        {selectedRequest && !showCompleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Consultation Request Details</CardTitle>
                <CardDescription>Request ID: {selectedRequest.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Respond to Consultation Request:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Create a Google Meet link (meet.google.com)</li>
                      <li>Fill in the meeting details below</li>
                      <li>Generate calendar file (.ics)</li>
                      <li>Email the file to: <strong>{selectedRequest.user_email}</strong></li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h4 className="font-medium">Generate Calendar Invite:</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Meeting Date <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Meeting Time <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="time"
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Duration (minutes) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                        min="15"
                        max="120"
                        step="15"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Google Meet Link <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="url"
                        placeholder="https://meet.google.com/xxx-yyyy-zzz"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={handleGenerateCalendar}
                      disabled={generatingCalendar || !meetingDate || !meetingTime || !meetingLink}
                      className="w-full"
                    >
                      {generatingCalendar ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Calendar className="h-4 w-4 mr-2" />
                          Generate Calendar File
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">User's Preferred Times:</h4>
                  <ul className="text-sm text-muted-foreground ml-4 space-y-1">
                    {selectedRequest.preferred_time_ranges.map((range, idx) => (
                      <li key={idx}>• {formatTimeRange(range)}</li>
                    ))}
                  </ul>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRequest(null);
                    setMeetingDate('');
                    setMeetingTime('');
                    setDurationMinutes('45');
                    setMeetingLink('');
                  }}
                  className="w-full"
                >
                  Close
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
