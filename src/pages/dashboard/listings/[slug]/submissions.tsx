import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { Button, Flex, Image, Text, useDisclosure } from '@chakra-ui/react';
import axios from 'axios';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { LoadingSection } from '@/components/shared/LoadingSection';
import { PublishResults } from '@/components/submissions/PublishResults';
import type { Bounty } from '@/features/listings';
import {
  SubmissionDetails,
  SubmissionHeader,
  SubmissionList,
  SubmissionUserDetails,
} from '@/features/sponsor-dashboard';
import type { SubmissionWithUser } from '@/interface/submission';
import { Sidebar } from '@/layouts/Sponsor';
import { userStore } from '@/store/user';
import { dayjs } from '@/utils/dayjs';
import { sortRank } from '@/utils/rank';

interface Props {
  slug: string;
}

function BountySubmissions({ slug }: Props) {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { userInfo } = userStore();
  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [totalWinners, setTotalWinners] = useState(0);
  const [totalPaymentsMade, setTotalPaymentsMade] = useState(0);
  const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([]);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionWithUser>();
  const [rewards, setRewards] = useState<string[]>([]);
  const [isBountyLoading, setIsBountyLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const length = 10;
  const [searchText, setSearchText] = useState('');

  const [usedPositions, setUsedPositions] = useState<string[]>([]);

  const getBounty = async () => {
    setIsBountyLoading(true);
    try {
      const bountyDetails = await axios.get(`/api/bounties/${slug}/`);
      setBounty(bountyDetails.data);
      if (bountyDetails.data.sponsorId !== userInfo?.currentSponsorId) {
        router.push('/dashboard/listings');
      }
      setTotalPaymentsMade(bountyDetails.data.paymentsMade || 0);

      const usedPos = bountyDetails.data.Submission.filter(
        (s: any) => s.isWinner,
      ).map((s: any) => s.winnerPosition);
      setUsedPositions(usedPos);

      setTotalSubmissions(bountyDetails.data.totalSubmissions);
      setTotalWinners(bountyDetails.data.winnersSelected);
      setTotalPaymentsMade(bountyDetails.data.paymentsMade);

      const ranks = sortRank(Object.keys(bountyDetails.data.rewards || {}));
      setRewards(ranks);
      setIsBountyLoading(false);
    } catch (e) {
      setIsBountyLoading(false);
    }
  };

  const getSubmissions = async () => {
    try {
      const submissionDetails = await axios.get(
        `/api/bounties/${slug}/submissions`,
        {
          params: {
            searchText,
            take: length,
            skip,
          },
        },
      );
      setSubmissions(submissionDetails.data);
      setSelectedSubmission(submissionDetails.data[0]);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    if (userInfo?.currentSponsorId) {
      getSubmissions();
    }
  }, [userInfo?.currentSponsorId, skip, searchText]);

  useEffect(() => {
    if (userInfo?.currentSponsorId) {
      getBounty();
    }
  }, [userInfo?.currentSponsorId]);

  return (
    <Sidebar>
      {isBountyLoading ? (
        <LoadingSection />
      ) : (
        <>
          {isOpen && (
            <PublishResults
              isOpen={isOpen}
              onClose={onClose}
              totalWinners={totalWinners}
              totalPaymentsMade={totalPaymentsMade}
              rewards={Object.keys(bounty?.rewards || {})}
              bountyId={bounty?.id}
              isDeadlinePassed={dayjs().isAfter(bounty?.deadline)}
              hasWinnersAnnounced={bounty?.isWinnersAnnounced}
              isRolling={bounty?.type === 'rolling'}
            />
          )}
          <SubmissionHeader
            bounty={bounty}
            onOpen={onOpen}
            totalSubmissions={totalSubmissions}
          />
          {!submissions?.length && !searchText ? (
            <>
              <Image
                w={32}
                mx="auto"
                mt={32}
                alt={'talent empty'}
                src="/assets/bg/talent-empty.svg"
              />
              <Text
                mx="auto"
                mt={5}
                color={'brand.slate.600'}
                fontSize={'lg'}
                fontWeight={600}
                textAlign={'center'}
              >
                People are working!
              </Text>
              <Text
                mx="auto"
                mb={200}
                color={'brand.slate.400'}
                fontWeight={500}
                textAlign={'center'}
              >
                Submissions will start appearing here
              </Text>
            </>
          ) : (
            <>
              <Flex align={'start'} bg="white">
                <Flex flex="4 1 auto" minH="600px">
                  <SubmissionList
                    submissions={submissions}
                    setSearchText={setSearchText}
                    selectedSubmission={selectedSubmission}
                    setSelectedSubmission={setSelectedSubmission}
                  />
                  <SubmissionDetails
                    bounty={bounty}
                    submissions={submissions}
                    setSubmissions={setSubmissions}
                    selectedSubmission={selectedSubmission}
                    setSelectedSubmission={setSelectedSubmission}
                    rewards={rewards}
                    usedPositions={usedPositions}
                    setUsedPositions={setUsedPositions}
                    setTotalPaymentsMade={setTotalPaymentsMade}
                    setTotalWinners={setTotalWinners}
                  />
                  <SubmissionUserDetails
                    submissions={submissions}
                    selectedSubmission={selectedSubmission}
                  />
                </Flex>
              </Flex>
              <Flex align="center" justify="start" gap={4} mt={4}>
                <Button
                  isDisabled={skip <= 0}
                  leftIcon={<ChevronLeftIcon w={5} h={5} />}
                  onClick={() =>
                    skip >= length ? setSkip(skip - length) : setSkip(0)
                  }
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <Text color="brand.slate.400" fontSize="sm">
                  <Text as="span" fontWeight={700}>
                    {skip + 1}
                  </Text>{' '}
                  -{' '}
                  <Text as="span" fontWeight={700}>
                    {Math.min(skip + length, totalSubmissions)}
                  </Text>{' '}
                  of{' '}
                  <Text as="span" fontWeight={700}>
                    {totalSubmissions}
                  </Text>{' '}
                  Submissions
                </Text>
                <Button
                  isDisabled={
                    totalSubmissions <= skip + length ||
                    (skip > 0 && skip % length !== 0)
                  }
                  onClick={() => skip % length === 0 && setSkip(skip + length)}
                  rightIcon={<ChevronRightIcon w={5} h={5} />}
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </Flex>
            </>
          )}
        </>
      )}
    </Sidebar>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.query;
  return {
    props: { slug },
  };
};

export default BountySubmissions;
