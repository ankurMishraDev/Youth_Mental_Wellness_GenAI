'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  User, 
  GraduationCap, 
  Languages, 
  Star, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Consultant {
  id: string;
  name: string;
  age: number;
  gender: string;
  specialty: string;
  sub_specialty: string[];
  languages: string[];
  experience_years: number;
  education: string;
  certifications: string[];
  bio: string;
  photo_url: string;
  rating: number;
  is_active: boolean;
}

interface Recommendation {
  id: string;
  consultant_id: string;
  recommendation_reason: string;
  urgency_level: 'low' | 'moderate' | 'high';
  consultant: Consultant;
}

export default function ConsultantsPage() {
  const auth = useAuth();
  const { toast } = useToast();
  
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [hasRecommendations, setHasRecommendations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  
  // Booking form state
  const [dataConsent, setDataConsent] = useState(false);
  const [selectedTimeRanges, setSelectedTimeRanges] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const timeRangeOptions = [
    { value: 'weekday_mornings', label: 'Weekday Mornings (9 AM - 12 PM)' },
    { value: 'weekday_afternoons', label: 'Weekday Afternoons (2 PM - 5 PM)' },
    { value: 'weekday_evenings', label: 'Weekday Evenings (6 PM - 8 PM)' },
    { value: 'weekend_mornings', label: 'Weekend Mornings (9 AM - 12 PM)' },
    { value: 'weekend_afternoons', label: 'Weekend Afternoons (2 PM - 5 PM)' },
  ];

  useEffect(() => {
    if (auth.currentUser?.uid) {
      fetchRecommendations();
    }
  }, [auth.currentUser]);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(`/api/consultants/recommendations/${auth.currentUser?.uid}`);
      const data = await response.json();
      
      if (data.success) {
        setHasRecommendations(data.has_recommendations);
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load consultant recommendations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConsultant = (consultant: Consultant) => {
    setSelectedConsultant(consultant);
    setShowBookingForm(true);
    setDataConsent(false);
    setSelectedTimeRanges([]);
  };

  const toggleTimeRange = (value: string) => {
    setSelectedTimeRanges(prev =>
      prev.includes(value)
        ? prev.filter(t => t !== value)
        : [...prev, value]
    );
  };

  const handleSubmitRequest = async () => {
    if (!selectedConsultant || selectedTimeRanges.length === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please select at least one time range',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const recommendation = recommendations.find(
        r => r.consultant_id === selectedConsultant.id
      );

      const response = await fetch('/api/consultants/submit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: auth.currentUser?.uid,
          consultant_id: selectedConsultant.id,
          recommendation_id: recommendation?.id || null,
          data_sharing_consent: dataConsent,
          preferred_time_ranges: selectedTimeRanges,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Request Submitted!',
          description: data.message || 'Your consultation request has been submitted.',
        });
        setShowBookingForm(false);
        setSelectedConsultant(null);
        // Refresh recommendations
        fetchRecommendations();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit consultation request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismissRecommendation = async (recommendationId: string) => {
    if (!confirm('Are you sure you want to dismiss this recommendation?')) {
      return;
    }

    setDismissingId(recommendationId);

    try {
      const response = await fetch('/api/consultants/dismiss-recommendation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: auth.currentUser?.uid,
          recommendation_id: recommendationId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Recommendation Dismissed',
          description: 'The recommendation has been removed from your list.',
        });
        // Remove from UI immediately
        setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
        
        // Check if there are any recommendations left
        if (recommendations.length === 1) {
          setHasRecommendations(false);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
      toast({
        title: 'Error',
        description: 'Failed to dismiss recommendation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDismissingId(null);
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'high': return 'destructive';
      case 'moderate': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-gradient-to-br from-orange-50 via-white to-orange-100">
        <DashboardHeader 
          title="Mental Health Consultants"
          description="Connect with professional mental health consultants"
          currentUser={auth.currentUser} 
        />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 h-screen overflow-hidden flex flex-col bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <DashboardHeader 
        title="Mental Health Consultants"
        description="Connect with professional mental health consultants"
        currentUser={auth.currentUser} 
      />

      {!hasRecommendations ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Recommendations Yet</h3>
              <p className="text-muted-foreground mb-4">
                Our AI will recommend professional consultants when it detects you might benefit from additional support.
              </p>
              <p className="text-sm text-muted-foreground">
                Continue using the AI sessions and journal features to receive personalized recommendations.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 flex-1 overflow-hidden flex flex-col gap-4">
          {/* Recommendation Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Professional Support Recommended</AlertTitle>
            <AlertDescription>
              Based on your recent interactions, our AI has identified that you might benefit from professional consultation.
              Below are mental health professionals who can provide specialized support.
            </AlertDescription>
          </Alert>

          {/* Main Content - Side by Side Layout */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[40%_60%] gap-6 overflow-hidden">
            {/* Left: Consultant Cards */}
            <div className="overflow-y-auto space-y-4 pr-2">
              {recommendations.map((rec) => {
                const consultant = rec.consultant;
                if (!consultant) return null;

                return (
                  <Card key={rec.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{consultant.name}</CardTitle>
                            <CardDescription className="text-xs">{consultant.specialty}</CardDescription>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-medium">{consultant.rating}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Badge variant={getUrgencyColor(rec.urgency_level)} className="text-xs">
                            {rec.urgency_level}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDismissRecommendation(rec.id)}
                            disabled={dismissingId === rec.id}
                            title="Dismiss recommendation"
                          >
                            {dismissingId === rec.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {/* Recommendation Reason */}
                      <Alert variant="default" className="bg-blue-50 dark:bg-blue-950 py-2">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          <strong>Why recommended:</strong> {rec.recommendation_reason}
                        </AlertDescription>
                      </Alert>

                      {/* Bio - Shortened */}
                      <p className="text-xs text-muted-foreground line-clamp-2">{consultant.bio}</p>

                      {/* Details - Compact */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground line-clamp-1">{consultant.education}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{consultant.experience_years} years experience</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Languages className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{consultant.languages.join(', ')}</span>
                        </div>
                      </div>

                      {/* Specialties - Compact */}
                      <div>
                        <p className="text-xs font-medium mb-1">Specializations:</p>
                        <div className="flex flex-wrap gap-1">
                          {consultant.sub_specialty.map((spec, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button 
                        onClick={() => handleSelectConsultant(consultant)}
                        className="w-full h-8 text-xs"
                        disabled={selectedConsultant?.id === consultant.id && showBookingForm}
                      >
                        {selectedConsultant?.id === consultant.id && showBookingForm
                          ? 'Selected'
                          : 'Request Consultation'
                        }
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Right: Booking Form */}
            {showBookingForm && selectedConsultant && (
              <div className="overflow-y-auto">
                <Card className="border-primary h-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Book Consultation with {selectedConsultant.name}</CardTitle>
                    <CardDescription className="text-xs">
                      Please provide your preferences for the consultation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Data Sharing Consent */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Data Sharing</h4>
                      <div className="flex items-start space-x-3 p-3 border rounded-lg">
                        <Checkbox
                          id="data-consent"
                          checked={dataConsent}
                          onCheckedChange={(checked) => setDataConsent(checked as boolean)}
                        />
                        <div className="space-y-1">
                          <label
                            htmlFor="data-consent"
                            className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Share my profile and psychological profiling data
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {dataConsent
                              ? 'Your full profile and profiling details will be shared with the consultant (same as export feature)'
                              : 'Only basic demographics (name, age, gender, email) will be shared'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Time Preferences */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Preferred Time Ranges</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Select your available time slots. The consultant will propose a specific time.
                      </p>
                      <div className="space-y-2">
                        {timeRangeOptions.map((option) => (
                          <div key={option.value} className="flex items-center space-x-3 p-2 border rounded-lg hover:bg-accent">
                            <Checkbox
                              id={option.value}
                              checked={selectedTimeRanges.includes(option.value)}
                              onCheckedChange={() => toggleTimeRange(option.value)}
                            />
                            <label
                              htmlFor={option.value}
                              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                            >
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-3">
                      <Button
                        onClick={handleSubmitRequest}
                        disabled={submitting || selectedTimeRanges.length === 0}
                        className="flex-1 h-9 text-xs"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-3 w-3" />
                            Submit Request
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowBookingForm(false);
                          setSelectedConsultant(null);
                        }}
                        disabled={submitting}
                        className="h-9 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>

                    {/* Info */}
                    <Alert className="py-2">
                      <AlertCircle className="h-3 w-3" />
                      <AlertDescription className="text-[10px]">
                        After submitting, you'll receive an email within 24 hours with a proposed consultation time.
                        This is a prototype - consultations are for demonstration purposes only.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
