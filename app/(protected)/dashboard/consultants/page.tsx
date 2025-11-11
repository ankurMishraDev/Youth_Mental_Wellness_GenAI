'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardHeader } from '@/components/DashboardHeader';
import { MobileHeader } from "@/components/MobileHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
  const isMobile = useIsMobile();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [hasRecommendations, setHasRecommendations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  
  // View All Consultants state
  const [showAllConsultants, setShowAllConsultants] = useState(false);
  const [allConsultants, setAllConsultants] = useState<Consultant[]>([]);
  const [loadingAllConsultants, setLoadingAllConsultants] = useState(false);
  
  // Booking form state
  const [dataConsent, setDataConsent] = useState(false);
  const [selectedTimeRanges, setSelectedTimeRanges] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  
  // Confirmation dialog state
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [recommendationToDismiss, setRecommendationToDismiss] = useState<string | null>(null);

  const timeRangeOptions = [
    { value: 'weekday_mornings', label: 'Weekday Mornings (9 AM - 12 PM)' },
    { value: 'weekday_afternoons', label: 'Weekday Afternoons (2 PM - 5 PM)' },
    { value: 'weekday_evenings', label: 'Weekday Evenings (6 PM - 8 PM)' },
    { value: 'weekend_mornings', label: 'Weekend Mornings (9 AM - 12 PM)' },
    { value: 'weekend_afternoons', label: 'Weekend Afternoons (2 PM - 5 PM)' },
  ];

  useEffect(() => {
    console.log('useEffect triggered, auth.currentUser:', auth.currentUser);
    if (auth.currentUser?.uid) {
      console.log('Fetching recommendations for UID:', auth.currentUser.uid);
      fetchRecommendations();
    } else {
      console.log('No user ID available, skipping fetch');
      setLoading(false);
    }
  }, [auth.currentUser]);

  // Debug useEffect to track state changes
  useEffect(() => {
    console.log('🔍 State updated - hasRecommendations:', hasRecommendations);
    console.log('🔍 State updated - recommendations length:', recommendations.length);
    console.log('🔍 State updated - recommendations:', recommendations);
  }, [hasRecommendations, recommendations]);

  const fetchRecommendations = async () => {
    console.log('fetchRecommendations called for UID:', auth.currentUser?.uid);
    try {
      const url = `/api/consultants/recommendations/${auth.currentUser?.uid}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        console.log('Setting has_recommendations:', data.has_recommendations);
        console.log('Setting recommendations:', data.recommendations);
        setHasRecommendations(data.has_recommendations);
        setRecommendations(data.recommendations || []);
      } else {
        console.error('API returned success: false', data);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load consultant recommendations',
        variant: 'destructive',
      });
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const fetchAllConsultants = async () => {
    setLoadingAllConsultants(true);
    try {
      const response = await fetch('/api/consultants');
      const data = await response.json();
      
      if (data.success) {
        // Filter out already recommended consultants
        const recommendedIds = recommendations.map(r => r.consultant_id);
        const filtered = (data.consultants || []).filter(
          (c: Consultant) => c.is_active && !recommendedIds.includes(c.id)
        );
        setAllConsultants(filtered);
      }
    } catch (error) {
      console.error('Error fetching consultants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load consultants',
        variant: 'destructive',
      });
    } finally {
      setLoadingAllConsultants(false);
    }
  };

  const toggleViewAllConsultants = () => {
    if (!showAllConsultants) {
      // Fetch consultants when opening
      fetchAllConsultants();
    }
    setShowAllConsultants(!showAllConsultants);
  };

  // Check if user can request consultant (24hr cooldown)
  const canRequestConsultant = (consultantId: string): boolean => {
    const cooldownKey = `consultant_request_${consultantId}`;
    const requestTime = localStorage.getItem(cooldownKey);
    
    if (!requestTime) return true; // Never requested
    
    const elapsed = Date.now() - parseInt(requestTime);
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    return elapsed > twentyFourHours;
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
        // Store request timestamp for 24hr cooldown
        const cooldownKey = `consultant_request_${selectedConsultant.id}`;
        localStorage.setItem(cooldownKey, Date.now().toString());
        
        toast({
          title: 'Request Sent Successfully! ✅',
          description: 'The consultant will contact you within 24 hours via email.',
          duration: 6000,
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
      setShowDismissConfirm(false);
      setRecommendationToDismiss(null);
    }
  };

  const handleDismissClick = (recommendationId: string) => {
    setRecommendationToDismiss(recommendationId);
    setShowDismissConfirm(true);
  };

  const handleCancelDismiss = () => {
    setShowDismissConfirm(false);
    setRecommendationToDismiss(null);
  };

  const handleConfirmDismiss = () => {
    if (recommendationToDismiss) {
      handleDismissRecommendation(recommendationToDismiss);
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
        {isMobile ? (
          <MobileHeader page="consultants" />
        ) : (
          <DashboardHeader 
            title="Mental Health Consultants"
            description="Connect with professional mental health consultants"
            currentUser={auth.currentUser} 
          />
        )}
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen flex flex-col bg-gradient-to-br from-orange-50 via-white to-orange-100">
      {isMobile ? (
        <MobileHeader page="consultants" />
      ) : (
        <DashboardHeader 
          title="Mental Health Consultants"
          description="Connect with professional mental health consultants"
          currentUser={auth.currentUser} 
        />
      )}

      {recommendations.length === 0 ? (
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
                  <Card key={rec.id} className="border-2 border-transparent bg-clip-padding bg-gradient-to-br from-purple-100 via-white to-orange-100 p-0.5 shadow-lg transition-all hover:shadow-xl">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center shadow-md">
                            <User className="h-6 w-6 text-white" />
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
                            onClick={() => handleDismissClick(rec.id)}
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
                      <Alert variant="default" className="bg-green-50 dark:bg-green-950 py-2 border-green-200 dark:border-green-800">
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
                        className="w-full h-8 text-xs bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105"
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
          </div>
        </div>
      )}

      {/* View All Consultants Section */}
      <div className="mt-6 space-y-4">
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={toggleViewAllConsultants}
            className="w-full max-w-md"
          >
            {showAllConsultants ? (
              <>
                Hide All Consultants
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                View All Available Consultants
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </Button>
        </div>

        {showAllConsultants && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Disclaimer Alert */}
            <Alert variant="default" className="border-yellow-500 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Self-Selected Consultation</AlertTitle>
              <AlertDescription className="text-yellow-700">
                ⚠️ You are choosing a consultant on your own. These consultants are <strong className="block">not AI-recommended</strong> based on your mental wellness profile. 
                If you're unsure, please wait for an AI recommendation or complete more sessions for personalized suggestions.
              </AlertDescription>
            </Alert>

            {/* Loading State */}
            {loadingAllConsultants && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}

            {/* Consultants Grid */}
            {!loadingAllConsultants && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allConsultants.map((consultant) => {
                  const canRequest = canRequestConsultant(consultant.id);
                  
                  return (
                    <Card key={consultant.id} className="border shadow-sm hover:shadow-md transition-all">
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                            <User className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{consultant.name}</CardTitle>
                            <CardDescription className="text-xs">{consultant.specialty}</CardDescription>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-medium">{consultant.rating}</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pb-4">
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{consultant.education}</span>
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

                        <div className="flex flex-wrap gap-1">
                          {consultant.sub_specialty.slice(0, 2).map((spec, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] py-0">
                              {spec}
                            </Badge>
                          ))}
                          {consultant.sub_specialty.length > 2 && (
                            <Badge variant="outline" className="text-[10px] py-0">
                              +{consultant.sub_specialty.length - 2} more
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {consultant.bio}
                        </p>

                        <Button
                          size="sm"
                          className="w-full h-8 text-xs"
                          onClick={() => handleSelectConsultant(consultant)}
                          disabled={!canRequest}
                          variant={canRequest ? "default" : "secondary"}
                        >
                          {canRequest ? (
                            <>Request Consultation</>
                          ) : (
                            <>Request Sent (24hr cooldown)</>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}

                {allConsultants.length === 0 && !loadingAllConsultants && (
                  <div className="col-span-2 text-center py-12">
                    <p className="text-muted-foreground">No additional consultants available at this time.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && selectedConsultant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <Card className="border-primary">
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
                    
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Dismiss Confirmation Dialog */}
      {showDismissConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Dismiss Recommendation
              </CardTitle>
              <CardDescription>
                Are you sure you want to dismiss this consultant recommendation?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This action cannot be undone. The consultant will be removed from your recommended list.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelDismiss}
                disabled={dismissingId === recommendationToDismiss}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDismiss}
                disabled={dismissingId === recommendationToDismiss}
              >
                {dismissingId === recommendationToDismiss ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Dismissing...
                  </>
                ) : (
                  'Yes, Dismiss'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
