'use client'

import { useCurrentWallet } from '@/components/auth/hooks/use-current-wallet'
import { Alert } from '@/components/common/alert'
import { Button } from '@/components/common/button'
import { LoadCircle } from '@/components/common/load-circle'
import { Input } from '@/components/form/input'
import { SubmitButton } from '@/components/form/submit-button'
import { useCreateProfile } from '@/components/profile/hooks/use-create-profile'
import { useGetIdentities } from '@/components/profile/hooks/use-get-identities'
import { IProfileList } from '@/models/profile.models'
import { cn } from '@/utils/utils'
import { usePrivy } from '@privy-io/react-auth'
import { User } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

interface Props {
  setCreateProfileDialog: (isOpen: boolean) => void
  setIsProfileCreated: (val: boolean) => void
  setProfileUsername: (val: string) => void
}

export function CreateProfile({
  setCreateProfileDialog,
  setIsProfileCreated,
  setProfileUsername,
}: Props) {
  const { walletAddress, loadingMainUsername } = useCurrentWallet()
  const { logout } = usePrivy()

  const [username, setUsername] = useState('')
  const [selectProfile, setSelectProfile] = useState<IProfileList | null>(null)

  const {
    createProfile,
    loading: creationLoading,
    error,
    response,
  } = useCreateProfile()

  const { data: identities, loading: profilesLoading } = useGetIdentities({
    walletAddress: walletAddress || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (walletAddress && username) {
      // Call the createProfile function with the provided username and wallet address
      await createProfile({ username, walletAddress })
      setIsProfileCreated(true)
      setProfileUsername(username)
      setCreateProfileDialog(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    const validValue = value.toLowerCase().replace(/[^a-z0-9]/g, '')
    setUsername(validValue)
  }

  const handleClick = async (elem: IProfileList) => {
    if (!walletAddress) {
      return
    }

    try {
      const result = await createProfile({
        username: elem.profile.username,
        walletAddress: walletAddress,
        bio: elem.profile.bio,
        image: elem.profile.image,
      })

      if (result) {
        setIsProfileCreated(true)
        setProfileUsername(elem.profile.username)
        setCreateProfileDialog(false)
        // Add a small delay before reload to ensure state updates are processed
        setTimeout(() => {
          window.location.reload()
        }, 100)
      }
    } catch (err) {
      console.error('Failed to import profile:', err)
      // Error will be displayed through the error state in the UI
    }
  }

  if (loadingMainUsername && profilesLoading) {
    return (
      <div className="flex items-center justify-center w-full py-32">
        <LoadCircle />
      </div>
    )
  }

  return (
    <>
      <div className="w-full">
        <h2 className="text-xl mb-3">Create Profile</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex items-center">
            <Input
              value={username}
              onChange={handleInputChange}
              name="username"
              placeholder="username"
            />
          </div>
          <SubmitButton>
            {creationLoading ? 'Creating...' : 'Create Profile'}
          </SubmitButton>
        </form>

        {error && <Alert type="error" message={error} />}
        {response && (
          <Alert type="success" message="Profile created successfully!" />
        )}
        <div className="bg-foreground h-[1px] w-full my-4" />
        <div className="flex flex-col space-y-4 items-center w-full">
          <div className="w-full">
            {identities &&
            identities.identities &&
            identities.identities.length > 0 ? (
              <div className="w-full h-[200px] overflow-auto">
                {identities.identities.map((identity, identityIndex) =>
                  identity?.profiles?.length > 0
                    ? identity.profiles.map((entry, profileIndex) => (
                        <Button
                          key={`${identityIndex}-${profileIndex}`}
                          disabled={profilesLoading}
                          variant="ghost"
                          onClick={() => setSelectProfile(entry)}
                          className="flex items-start justify-start w-full"
                        >
                          <div
                            className={cn(
                              'flex items-center border-2 rounded-sm w-full p-2 space-y-2',
                              {
                                'border border-accent': selectProfile === entry,
                                'border border-mutedLight':
                                  selectProfile !== entry,
                              },
                            )}
                          >
                            <div className="flex items-center space-x-2">
                              <div className="relative rounded-full w-11 h-11 bg-muted-foreground shrink-0 flex items-center justify-center">
                                {entry.profile.image ? (
                                  <div>
                                    <Image
                                      width={30}
                                      height={30}
                                      alt="avatar"
                                      className="rounded-full object-cover"
                                      src={entry.profile.image}
                                      unoptimized
                                    />
                                  </div>
                                ) : (
                                  <User />
                                )}
                              </div>
                              <div className="w-2/3 flex flex-col items-start text-left">
                                <h4 className="text-md font-bold truncate w-full">
                                  {entry.profile?.username ?? 'No username'}
                                </h4>
                                {entry.profile?.bio && (
                                  <p className="text-xs text-muted-foreground truncate w-full">
                                    {entry.profile?.bio}
                                  </p>
                                )}
                                {entry?.namespace?.faviconURL && (
                                  <div className="mt-2 w-full">
                                    <Image
                                      width={15}
                                      height={15}
                                      alt="favicon"
                                      className="rounded-full object-cover"
                                      src={entry.namespace.faviconURL}
                                      unoptimized
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))
                    : null,
                )}
              </div>
            ) : (
              <p className="text-xs text-center">
                {profilesLoading && (
                  <>
                    Getting profiles from Tapestry.. Please wait
                    <br />
                  </>
                )}

                {!profilesLoading && (
                  <>
                    We could not find any profiles on Tapestry.
                    <br /> Create one to get started!
                  </>
                )}
              </p>
            )}
          </div>

          <Button
            className="w-full justify-center"
            variant="secondary"
            disabled={profilesLoading || selectProfile === null}
            onClick={() => {
              if (selectProfile) {
                handleClick(selectProfile)
              }
            }}
          >
            {creationLoading ? 'Importing...' : 'Import profile'}
          </Button>
          <Button
            className="w-full text-xs underline justify-center"
            variant="ghost"
            onClick={() => {
              logout()
              setCreateProfileDialog(false)
            }}
          >
            Disconnect wallet
          </Button>
        </div>
      </div>
    </>
  )
}
