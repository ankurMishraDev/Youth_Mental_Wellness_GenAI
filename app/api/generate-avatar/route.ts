import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { style = 'modern', gender = 'neutral', age = 'young' } = body;

    // Create a well-defined prompt for youth-friendly profile picture
    const prompt = generateDetailedPrompt(style, gender, age);

    console.log('Generating profile picture with Google Imagen 4.0:', prompt);

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured in .env.local');
    }

    // Call Google Imagen 4.0 API
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict',
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: prompt,
            }
          ],
          parameters: {
            sampleCount: 1, // Generate 1 image
            aspectRatio: '1:1', // Square for profile pictures
            personGeneration: 'allow_adult', // Allow person generation
            safetyFilterLevel: 'block_some', // Safe content
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Imagen API Error:', errorText);
      throw new Error(`Imagen API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    console.log('Imagen API Response:', JSON.stringify(data, null, 2));

    // Extract the generated image from the response
    if (!data.predictions || data.predictions.length === 0) {
      throw new Error('No image generated from Imagen API');
    }

    const prediction = data.predictions[0];
    
    // The image is returned as base64 in the bytesBase64Encoded field
    const imageBase64 = prediction.bytesBase64Encoded;
    
    if (!imageBase64) {
      throw new Error('No image data received from Imagen API');
    }

    // Create data URL for direct display
    const imageUrl = `data:image/png;base64,${imageBase64}`;

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      prompt: prompt,
    });

  } catch (error: any) {
    console.error('Error generating profile picture:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate profile picture',
      },
      { status: 500 }
    );
  }
}

function generateDetailedPrompt(style: string, gender: string, age: string): string {
  // Following Google Imagen best practices for ANIMATED/ILLUSTRATED characters
  // NOT photorealistic - all outputs will be cartoon/illustrated/animated
  
  const genderDescriptors = {
    male: 'young man',
    female: 'young woman',
    neutral: 'person',
  };

  const ageDescriptors = {
    teen: 'teenage, youthful',
    young: 'in their early twenties',
    adult: 'in their late twenties',
  };

  const genderDesc = genderDescriptors[gender as keyof typeof genderDescriptors] || 'person';
  const ageDesc = ageDescriptors[age as keyof typeof ageDescriptors] || 'in their early twenties';

  // Style-specific prompts - ALL ANIMATED/ILLUSTRATED, NO PHOTOREALISTIC
  const stylePrompts: Record<string, string> = {
    modern: `A clean modern illustrated character portrait of a ${genderDesc} ${ageDesc}. Digital illustration style with smooth vector art, minimal shading, friendly cartoon aesthetic. Soft pastel background in blue or lavender. Character has a warm, friendly smile and approachable expression. Simple clean design, professional digital illustration. Flat design with subtle gradients, contemporary character art style.`,
    
    artistic: `A beautiful artistic character illustration of a ${genderDesc} ${ageDesc} in expressive cartoon style. Vibrant colors with painterly digital art aesthetic, creative and inspiring mood. Soft pastel background with artistic flair. Gentle, friendly expression. Stylized character design, not photorealistic, professional quality digital character art with bold colors and smooth rendering.`,
    
    minimal: `A minimalist illustrated character of a ${genderDesc} ${ageDesc} in simple geometric style. Clean vector art with flat colors and simple shapes. Serene and peaceful expression, calm demeanor. Ultra-simplified character design with pastel color palette. Modern flat illustration style, not realistic, geometric simplified features. Soft gradient background in soothing colors.`,
    
    cartoon: `A friendly cute cartoon character portrait of a ${genderDesc} ${ageDesc}. Big eyes, rounded features, bright cheerful colors in classic cartoon style. Big warm smile, playful and uplifting mood. Smooth cartoon illustration with polished finish. Fun animated character style, not photorealistic, professional quality cartoon art. Soft pastel background, approachable and cute character design.`,
    
    anime: `A beautiful anime-style character illustration of a ${genderDesc} ${ageDesc}. Large expressive anime eyes with detailed hair and vibrant colors. Warm, positive expression with energetic mood. Anime art style with cel shading and clean linework. Not photorealistic, Japanese animation character design. Soft background in calming colors. Professional quality anime character illustration.`,
  };

  const basePrompt = stylePrompts[style] || stylePrompts.modern;
  
  // Add mental wellness context and EMPHASIZE non-photorealistic
  const finalPrompt = `${basePrompt} IMPORTANT: Create an illustrated/animated/cartoon character, NOT a photograph or photorealistic image. The image should be a stylized character illustration that conveys mental wellness, positivity, and emotional well-being. Use calming colors like soft blues, gentle greens, warm oranges, or lavender purples. Appropriate for youth mental health platform, safe for all audiences, professional quality character illustration.`;

  return finalPrompt;
}
