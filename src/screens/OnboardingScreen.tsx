// First-launch onboarding flow guiding new users through the app concept, modes, optional PIN, and install guidance.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LivingBackground, ScreenLayout, Button, NumberPad, ProgressDots } from '../components';
import { useLock } from '../context/LockContext';
import { seedSampleContent } from '../data/sampleContent';
import { STRINGS } from '../strings';
import './OnboardingScreen.css';

type OnboardingStep = 1 | 2 | 3 | 4;

export const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { setPin, completeOnboarding } = useLock();
  const [step, setStep] = useState<OnboardingStep>(1);

  // Optional PIN setup state
  const [typedPin, setTypedPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Platform detection for install guidance
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: boolean }).MSStream;
    const isAndroid = /Android/.test(ua);

    if (isIOS) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);

  const finishOnboarding = async (loadSamples: boolean) => {
    if (loadSamples) {
      await seedSampleContent();
    }
    await completeOnboarding();
    navigate('/');
  };

  const handleSkip = async () => {
    await completeOnboarding();
    navigate('/');
  };

  const handlePinDigit = (digit: string) => {
    setPinError(null);
    if (!isConfirming) {
      if (typedPin.length < 8) {
        setTypedPin((prev) => prev + digit);
      }
    } else {
      if (confirmPin.length < 8) {
        setConfirmPin((prev) => prev + digit);
      }
    }
  };

  const handlePinDelete = () => {
    setPinError(null);
    if (!isConfirming) {
      setTypedPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  const handleSavePinStep = async () => {
    if (!isConfirming) {
      if (typedPin.length < 4) {
        setPinError('PIN must be at least 4 digits.');
        return;
      }
      setIsConfirming(true);
      return;
    }

    if (confirmPin !== typedPin) {
      setPinError('PINs do not match. Try again.');
      setConfirmPin('');
      return;
    }

    await setPin(typedPin);
    setStep(4);
  };

  return (
    <>
      <LivingBackground mode={step === 2 ? 'charge' : step === 3 ? 'rescue' : 'start'} />

      <ScreenLayout maxWidth="md" className="onboarding-layout">
        <header className="onboarding-header">
          <ProgressDots total={4} current={step - 1} />
          <button type="button" className="skip-link" onClick={handleSkip}>
            {STRINGS.onboarding.skip}
          </button>
        </header>

        <main className="onboarding-body" role="main">
          {/* Step 1: Core Concept & Animated Session Preview */}
          {step === 1 && (
            <div className="onboarding-step-content animation-slide">
              <h1 className="step-title">{STRINGS.onboarding.step1Title}</h1>
              <p className="step-body-text">{STRINGS.onboarding.step1Body}</p>

              <div className="preview-card-container">
                <div className="preview-card">
                  <div className="preview-orb" aria-hidden="true" />
                  <p className="preview-quote">
                    “Give yourself permission to pause and breathe. Clarity follows deliberate space.”
                  </p>
                  <span className="preview-caption">Start mode • 1 of 3</span>
                </div>
              </div>

              <div className="step-action-row">
                <Button variant="primary" fullWidth size="lg" onClick={() => setStep(2)}>
                  {STRINGS.onboarding.next} →
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Three Distinct Modes */}
          {step === 2 && (
            <div className="onboarding-step-content animation-slide">
              <h1 className="step-title">{STRINGS.onboarding.step2Title}</h1>

              <div className="mode-cards-stack">
                <div className="intro-mode-card intro-mode--start">
                  <span className="intro-mode-badge">Start</span>
                  <p className="intro-mode-desc">{STRINGS.onboarding.step2Start}</p>
                </div>

                <div className="intro-mode-card intro-mode--charge">
                  <span className="intro-mode-badge">Charge</span>
                  <p className="intro-mode-desc">{STRINGS.onboarding.step2Charge}</p>
                </div>

                <div className="intro-mode-card intro-mode--rescue">
                  <span className="intro-mode-badge">Rescue</span>
                  <p className="intro-mode-desc">{STRINGS.onboarding.step2Rescue}</p>
                </div>
              </div>

              <div className="step-action-row">
                <Button variant="primary" fullWidth size="lg" onClick={() => setStep(3)}>
                  {STRINGS.onboarding.next} →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Optional PIN Setup */}
          {step === 3 && (
            <div className="onboarding-step-content animation-slide">
              <h1 className="step-title">{STRINGS.onboarding.step3Title}</h1>
              <p className="step-body-text">
                {isConfirming ? 'Confirm your new PIN' : STRINGS.onboarding.step3Body}
              </p>

              {pinError && <p className="onboarding-pin-error">{pinError}</p>}

              <div className="pin-indicators-row">
                {Array.from({ length: 4 }).map((_, i) => {
                  const currentPin = isConfirming ? confirmPin : typedPin;
                  return (
                    <span
                      key={i}
                      className={`pin-setup-dot ${i < currentPin.length ? 'pin-setup-dot--filled' : ''}`}
                    />
                  );
                })}
              </div>

              <NumberPad
                onDigit={handlePinDigit}
                onDelete={handlePinDelete}
                className="onboarding-numberpad"
              />

              <div className="pin-step-buttons">
                <Button
                  variant="primary"
                  fullWidth
                  disabled={(isConfirming ? confirmPin.length : typedPin.length) < 4}
                  onClick={handleSavePinStep}
                >
                  {isConfirming ? 'Save PIN' : 'Confirm PIN'}
                </Button>

                <Button variant="ghost" fullWidth onClick={() => setStep(4)}>
                  Skip PIN Setup
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Install Guidance & First Content Choice */}
          {step === 4 && (
            <div className="onboarding-step-content animation-slide">
              <h1 className="step-title">{STRINGS.onboarding.installTitle}</h1>

              <div className="install-banner">
                <div className="install-icon" aria-hidden="true">📱</div>
                <p className="install-desc">
                  {platform === 'ios'
                    ? STRINGS.onboarding.installIos
                    : platform === 'android'
                    ? STRINGS.onboarding.installAndroid
                    : STRINGS.onboarding.installDesktop}
                </p>
              </div>

              <h2 className="choice-heading">{STRINGS.onboarding.choiceTitle}</h2>

              <div className="start-choice-stack">
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  onClick={() => finishOnboarding(true)}
                >
                  {STRINGS.onboarding.loadSamplesBtn}
                </Button>

                <Button
                  variant="secondary"
                  fullWidth
                  size="lg"
                  onClick={() => finishOnboarding(false)}
                >
                  {STRINGS.onboarding.emptySpaceBtn}
                </Button>
              </div>
            </div>
          )}
        </main>
      </ScreenLayout>
    </>
  );
};
